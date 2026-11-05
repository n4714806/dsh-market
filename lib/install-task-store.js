import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const statuses = new Set(['running','succeeded','failed','cancelled','interrupted','needs-attention']);
const clone = value => JSON.parse(JSON.stringify(value));
const text = value => String(value ?? '').replace(/[\x00-\x1f]/g, ' ').slice(0, 180);
// Never pass exception messages, model output, commands or logs to this store.
export class InstallTaskStore {
  constructor({dataDir, profile}) {
    this.profile = profile?.name ?? 'unavailable';
    const key = createHash('sha256').update(JSON.stringify([profile?.dir ?? null, this.profile])).digest('hex');
    this.dir = join(dataDir, 'install-tasks');
    this.file = join(this.dir, `${key}.json`);
    this.records = new Map(); this.seen = new Set();
    mkdirSync(this.dir, {recursive:true});
    let saved;
    try { saved = JSON.parse(readFileSync(this.file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('安裝任務記錄無法讀取；為避免重複執行已停止。'); }
    if (saved) {
      if (saved.version !== 1 || !Array.isArray(saved.tasks) || !Array.isArray(saved.seen)) throw new Error('安裝任務記錄格式不相容；已停止。');
      this.seen = new Set(saved.seen);
      for (const item of saved.tasks.slice(-100)) {
        if (!item.id || item.profile !== this.profile || !statuses.has(item.status)) throw new Error('安裝任務記錄無效；已停止。');
        this.records.set(item.id, item);
        if (item.status === 'running') this.update(item.id, {status:'interrupted',stage:'interrupted',message:'宿主或外掛已重新啟動；不會自動重試。'}, false);
      }
      this.persist();
    }
  }
  persist() {
    if (this.unavailable) throw new Error('任務儲存已停止；請重新啟動並檢查磁碟。');
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify({version:1,tasks:[...this.records.values()],seen:[...this.seen]}), {mode:0o600,flag:'wx'});
      const fd = openSync(temporary, 'r+'); try { fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, this.file);
    } catch (error) { this.unavailable = true; try { unlinkSync(temporary); } catch {} throw new Error('安裝任務記錄無法保存；已停止新的操作。'); }
  }
  assertAvailable() { if (this.unavailable) throw new Error('任務儲存不可用；停止操作，請檢查磁碟後重新啟動。'); }
  list() { this.assertAvailable(); return clone([...this.records.values()].reverse()); }
  get(id) { this.assertAvailable(); return this.records.has(id) ? clone(this.records.get(id)) : null; }
  create({id = randomUUID(), pluginId, pluginName, kind}) {
    this.assertAvailable();
    // UI IDs include owner/repository; identity is never interpolated into a path.
    if (typeof id !== 'string' || !id.trim() || id.length > 160 || /[\x00-\x1f\x7f-\x9f]/.test(id)) throw new Error('installId 格式無效。');
    const hash = createHash('sha256').update(id).digest('hex');
    if (this.records.has(id)) return {created:false,record:this.get(id)};
    if (this.seen.has(hash)) throw new Error('此 installId 已使用且歷史已封存；不可重做。');
    const at = new Date().toISOString();
    const record = {id,pluginId:text(pluginId),pluginName:text(pluginName || pluginId),profile:this.profile,kind:text(kind),status:'running',stage:'queued',message:'任務已記錄，正在檢查。',createdAt:at,updatedAt:at,running:true,events:[{at,stage:'queued',message:'任務已記錄，正在檢查。'}]};
    // Never evict running work; reject capacity rather than lose cancellation ownership.
    if (this.records.size >= 100) {
      const oldest = [...this.records.values()].find(r => !r.running);
      if (!oldest) throw new Error('進行中的任務已達上限。');
      this.records.delete(oldest.id);
    }
    this.records.set(id, record); this.seen.add(hash); this.persist();
    return {created:true,record:this.get(id)};
  }
  update(id, patch, save = true) {
    this.assertAvailable();
    const record = this.records.get(id); if (!record) return null;
    if (!record.running) return this.get(id); // terminal states cannot be resurrected by late results
    if (patch.status && !statuses.has(patch.status)) throw new Error('Invalid task status');
    const keys = ['pluginName','stage','message','childSessionId','error','application','status'];
    if (!keys.some(key => patch[key] !== undefined && text(patch[key]) !== record[key])) return this.get(id);
    for (const key of ['pluginName','stage','message','childSessionId','error']) if (patch[key] !== undefined) record[key] = text(patch[key]);
    if (['applied','restart-required','not-applied'].includes(patch.application)) record.application = patch.application;
    record.status = patch.status ?? record.status; record.running = record.status === 'running';
    record.updatedAt = new Date().toISOString();
    record.events.push({at:record.updatedAt,stage:record.stage,message:record.message});
    record.events = record.events.slice(-50);
    if (save) this.persist();
    return this.get(id);
  }
}

export function taskReply(record) {
  if (!record) return {known:false,running:false};
  return {...record,installId:record.id,known:true,ok:record.status === 'succeeded',started:record.running && Boolean(record.childSessionId),cancelled:record.status === 'cancelled'};
}
