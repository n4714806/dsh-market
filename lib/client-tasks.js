window.__ModuleLoader__.load({
	id: "@dsh-market/plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/api.ts
		/** P6：RPC 错误附分类（人话原因 + 建议动作），不再是干巴巴的原始报错 */
		var RpcError = class extends Error {
			classified;
			constructor(message, classified) {
				super(message);
				this.classified = classified;
			}
		};
		async function api(method, args, opts) {
			const data = await (await fetch("/market/api", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					method,
					args: args ?? {}
				}),
				signal: opts?.signal
			})).json();
			if (!data.ok) throw new RpcError(data.error ?? "RPC failed", data.classified);
			return data.result;
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* 面板开关单一 store —— **仅旧入口（≤0.1.4）使用**：
		* sidebar.footer.action 的入口按钮与 shell.overlay 的面板跨 slot 共享开关状态。
		*
		* 0.1.5 走标准入口（sidebar.panellist + main）时不需要它：面板挂载/卸载由 layout
		* 的选中的 key 决定，开合即 `layout.selectPanel(id | null)`。
		*/
		let panelOpen = false;
		const listeners = /* @__PURE__ */ new Set();
		function subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		function getOpen() {
			return panelOpen;
		}
		function setOpen(v) {
			if (panelOpen === v) return;
			panelOpen = v;
			for (const l of listeners) l();
		}
		function toggle() {
			setOpen(!panelOpen);
		}
		//#endregion
		// Original portable-edition artwork; upstream reserved logo is not redistributed.
		function MarketLogo(props) {
			const { size = 22, color = "currentColor" } = props;
			return (0, react.createElement)("svg", {width:size,height:size,viewBox:"0 0 24 24","aria-label":"Portable Market (unofficial)",style:{display:"block"},fill:"none",stroke:color,strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round"},
				(0,react.createElement)("path",{d:"M3 7 12 3 21 7 12 11Z M3 7v10l9 4 9-4V7 M12 11v10"}),
				(0,react.createElement)("path",{d:"m7 5 9 4"}));
		}
		//#endregion
		//#region \0dsh-css:E:\wm\tool\lader\plugin\ui\src\client\styles.module.css.mjs
		const css = "*{box-sizing:border-box}:root{--mkt-text:#252525;--mkt-text2:#5f6670;--mkt-text3:#8a919f;--mkt-brand:#4d6bfe;--mkt-brand-strong:#2e4bd8;--mkt-brand-tint:#eaf2fb;--mkt-brand-soft:#c9d4f5;--mkt-border:#e5e7eb;--mkt-border-strong:#d4d7dc;--mkt-divider:#eef0f2;--mkt-selected:#f3f4f6;--mkt-hover:#edeef1;--mkt-bg:#f6f8fb;--mkt-inverse:#252525;--mkt-surface-a:#fff;--mkt-surface-b:#fff;--mkt-surface-c:#fff;--mkt-chip-warn-bg:#fef7e7;--mkt-chip-warn-text:#a97f1f;--mkt-chip-gold-bg:#fef3e2;--mkt-chip-gold-border:#f0d9a8;--mkt-chip-gold-text:#b45309;--mkt-chip-green-bg:#e8f6ee;--mkt-chip-green-border:#bfe3cd;--mkt-chip-green-text:#15803d;--mkt-chip-red-bg:#fdeaea;--mkt-chip-red-border:#f5c6c6;--mkt-chip-red-text:#b91c1c;--mkt-text-ok:#22c55e;--mkt-text-danger:#ef4444;--mkt-rate-ok:#1e7a46;--mkt-rate-warn:#b26a00;--mkt-rate-danger:#b33a3a;--mkt-purple:#7c3aed;--mkt-purple-bg:#f3efff}[data-slot=\"sidebar.footer.action\"]{flex-wrap:wrap;row-gap:4px;width:100%;display:flex!important}._LI32q_trigger{width:100%;min-height:34px;color:var(--dsw-alias-label-primary,var(--mkt-text));cursor:pointer;box-sizing:border-box;background:0 0;border:none;border-radius:8px;flex:0 0 100%;justify-content:flex-start;align-items:center;gap:8px;padding:0 12px;font-size:13px;display:flex}._LI32q_trigger:hover{color:var(--dsw-alias-label-primary,var(--mkt-text));background:var(--dsw-alias-interactive-bg-hover,var(--mkt-hover))}._LI32q_trigger[data-active]{color:var(--mkt-brand);background:var(--mkt-hover)}@media (prefers-color-scheme:dark){._LI32q_trigger{color:#e8eaed}._LI32q_trigger:hover{color:#fff;background:#ffffff1a}}._LI32q_triggerIcon{justify-content:center;align-items:center;line-height:1;display:inline-flex}._LI32q_triggerIcon svg{flex:none;width:16px;height:16px}._LI32q_triggerLabel{white-space:nowrap}._LI32q_backdrop{z-index:100;pointer-events:auto;background:0 0;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}._LI32q_panel{pointer-events:auto;width:560px;max-width:94vw;height:720px;max-height:92vh;color:var(--mkt-text);-webkit-font-smoothing:antialiased;background:#fff;border:1px solid #e5e7eb;border-radius:14px;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,PingFang SC,Noto Sans SC,Microsoft YaHei,Helvetica Neue,Arial,sans-serif;font-size:13px;display:flex;position:relative;overflow:hidden;box-shadow:0 8px 40px #00000024,0 2px 8px #00000014}._LI32q_mainHost{box-sizing:border-box;justify-content:center;align-items:stretch;width:100%;height:100%;min-height:0;padding:16px;display:flex;overflow:hidden}._LI32q_panelInMain{width:100%;max-width:960px;height:100%;max-height:none;margin:0 auto}._LI32q_header{border-bottom:1px solid #eef0f2;flex:none;align-items:center;gap:10px;padding:14px 16px 12px;display:flex}._LI32q_titleIcon{align-items:center;display:flex}._LI32q_titleIcon>svg{color:#4d6bfe;width:24px;height:24px}._LI32q_title{font-size:15px;font-weight:600}._LI32q_subtitle{color:var(--mkt-brand-strong);background:#eaf2fb;border-radius:10px;padding:2px 8px;font-size:11.5px;font-weight:500}._LI32q_headerClose{cursor:pointer;color:#8a919f;background:0 0;border:none;border-radius:7px;justify-content:center;align-items:center;width:28px;height:28px;margin-left:auto;transition:background-color .14s;display:flex}._LI32q_headerClose:hover{color:var(--mkt-text);background:#f3f4f6}._LI32q_headerClose svg{width:16px;height:16px}._LI32q_tabs{border-bottom:1px solid #eef0f2;flex:none;gap:2px;padding:0 12px;display:flex}._LI32q_tab{color:var(--mkt-text2);cursor:pointer;white-space:nowrap;background:0 0;border:none;margin:0 8px;padding:10px 4px;font-size:13px;position:relative}._LI32q_tab:hover{color:var(--mkt-text)}._LI32q_tabOn{color:var(--mkt-text);font-weight:600}._LI32q_tabOn:after{content:\"\";background:#4d6bfe;border-radius:2px;height:2px;position:absolute;bottom:-1px;left:0;right:0}._LI32q_body{scrollbar-width:thin;scrollbar-color:var(--mkt-border-strong) transparent;flex:1;min-height:0;padding:16px 16px 20px;overflow-y:auto}._LI32q_body::-webkit-scrollbar{width:6px}._LI32q_body::-webkit-scrollbar-thumb{background:var(--mkt-border-strong);border-radius:3px}._LI32q_body::-webkit-scrollbar-track{background:0 0}._LI32q_tabBody,._LI32q_section{flex-direction:column;display:flex}._LI32q_sectionHead{align-items:center;gap:7px;margin:20px 0 10px;display:flex}._LI32q_section:first-child>._LI32q_sectionHead{margin-top:2px}._LI32q_sectionIcon{color:#8a919f;flex:none;align-items:center;display:flex}._LI32q_sectionIcon>svg{width:14px;height:14px}._LI32q_sectionTitle{color:var(--mkt-text);margin:0;font-size:14px;font-weight:600}._LI32q_sectionNote{color:#8a919f;margin-left:auto;font-size:12px}._LI32q_btn{color:var(--mkt-text);cursor:pointer;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:6px 14px;font-family:inherit;font-size:12.5px;font-weight:500;transition:background-color .14s,border-color .14s,box-shadow .14s;box-shadow:0 1px 3px #0000000f}._LI32q_btn:hover{border-color:var(--mkt-border-strong);background:#f3f4f6}._LI32q_btn:disabled{opacity:.5;cursor:not-allowed}._LI32q_btnPrimary{background:var(--mkt-brand);border-color:var(--mkt-brand);color:#fff;box-shadow:0 1px 3px #4d6bfe59}._LI32q_btnPrimary:disabled{opacity:.5;cursor:not-allowed}._LI32q_btnGhost{box-shadow:none;color:var(--mkt-text2);border-color:#0000}._LI32q_btnGhost:hover{color:var(--mkt-text);background:#f3f4f6}._LI32q_btnSm{padding:4px 11px;font-size:12px}._LI32q_btnDanger{color:var(--mkt-text-danger);border-color:var(--mkt-chip-red-border)}._LI32q_btnDanger:hover{background:var(--mkt-chip-red-bg);border-color:var(--mkt-chip-red-border)}._LI32q_card{cursor:default;background:#fff;border:1px solid #e5e7eb;border-radius:11px;flex-direction:column;min-width:0;padding:14px;transition:box-shadow .15s,transform .15s,border-color .15s;display:flex;overflow:hidden;box-shadow:0 1px 3px #0000000f}._LI32q_card:hover{border-color:var(--mkt-border-strong);transform:translateY(-1px);box-shadow:0 2px 8px #0000001a}._LI32q_cardHead{align-items:center;gap:8px;display:flex}._LI32q_cardName{color:var(--mkt-text);text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;overflow:hidden}._LI32q_cardBadge{color:var(--mkt-brand-strong);background:#eaf2fb;border-radius:10px;flex:none;padding:1px 7px;font-size:11.5px;font-weight:500}._LI32q_compatChip{white-space:nowrap;background:var(--mkt-surface-c);color:var(--mkt-text3);border:1px solid #0000;border-radius:8px;flex:none;padding:1px 6px;font-size:10.5px;font-weight:500}._LI32q_compatChip[data-status=unknown]{background:var(--mkt-chip-warn-bg);color:var(--mkt-chip-warn-text);border-color:var(--mkt-chip-warn-border,transparent)}._LI32q_compatChip[data-status=incompatible]{background:var(--mkt-chip-red-bg);color:var(--mkt-chip-red-text);border-color:var(--mkt-chip-red-border)}._LI32q_cardStars{color:var(--mkt-text2);flex:none;align-items:center;gap:4px;margin-left:auto;font-size:12px;display:flex}._LI32q_cardStars>svg{width:13px;height:13px;color:var(--mkt-chip-warn-text)}._LI32q_cardDesc{color:var(--mkt-text2);-webkit-line-clamp:3;-webkit-box-orient:vertical;margin:8px 0 9px;font-size:13px;line-height:1.55;display:-webkit-box;overflow:hidden}._LI32q_cardTags,._LI32q_cardReasons{flex-wrap:wrap;gap:6px;margin-bottom:10px;display:flex}._LI32q_reason{color:var(--mkt-chip-green-text);background:var(--mkt-chip-green-bg);border-radius:8px;padding:2px 6px;font-size:11px}._LI32q_reasonAi{color:var(--mkt-brand-strong);background:#eaf2fb;border-radius:8px;padding:2px 6px;font-size:11px}._LI32q_cardActions{align-items:center;gap:6px;display:flex}._LI32q_spacer{margin-left:auto}._LI32q_needConfig{color:var(--mkt-chip-warn-text);font-size:11px}._LI32q_cardActionHint{color:#8a919f;text-align:right;margin-top:6px;font-size:11px}._LI32q_iconBtn{border:1px solid var(--mkt-border-strong);cursor:pointer;color:#8a919f;background:#fff;border-radius:7px;flex:none;justify-content:center;align-items:center;width:28px;height:28px;padding:0;transition:color .14s,border-color .14s,background-color .14s;display:flex;box-shadow:0 1px 3px #0000000f}._LI32q_iconBtn:hover{color:#4d6bfe;border-color:var(--mkt-brand-soft)}._LI32q_iconBtn:disabled{opacity:.5;cursor:not-allowed}._LI32q_iconBtn svg{width:15px;height:15px}._LI32q_iconBtnOn{color:#4d6bfe;border-color:var(--mkt-brand-soft)}._LI32q_favBtn{color:var(--mkt-text2);border:1px solid var(--mkt-border-strong);cursor:pointer;white-space:nowrap;background:#fff;border-radius:7px;justify-content:center;align-items:center;gap:4px;padding:4px 9px;font-family:inherit;font-size:12px;transition:color .14s,border-color .14s,background-color .14s;display:flex;box-shadow:0 1px 3px #0000000f}._LI32q_favBtn:hover{color:#4d6bfe;border-color:var(--mkt-brand-soft)}._LI32q_favBtnOn{color:#4d6bfe;border-color:var(--mkt-brand-soft);background:#eaf2fb}._LI32q_repoBtn{color:var(--mkt-text2);border:1px solid var(--mkt-border-strong);cursor:pointer;background:#fff;border-radius:7px;align-items:center;gap:5px;padding:4px 9px;font-family:inherit;font-size:12px;transition:color .14s,border-color .14s;display:flex;box-shadow:0 1px 3px #0000000f}._LI32q_repoBtn svg{width:13px;height:13px}._LI32q_repoBtn:hover{color:#4d6bfe;border-color:var(--mkt-brand-soft)}._LI32q_tag{color:var(--mkt-text3);cursor:pointer;user-select:none;background:#f3f4f6;border:none;border-radius:8px;padding:2px 6px;font-size:11px;transition:background-color .12s,color .12s}._LI32q_tag:hover{color:var(--mkt-brand-strong);background:#eaf2fb}._LI32q_tagOn{color:var(--mkt-brand-strong);background:#eaf2fb;font-weight:500}._LI32q_recommendToolbar{border:1px solid var(--mkt-brand-tint);background:#eaf2fb;border-radius:11px;align-items:center;gap:8px;margin-bottom:4px;padding:9px 12px;display:flex}._LI32q_recommendToolbarIcon{color:#4d6bfe;flex:none;align-items:center;display:flex}._LI32q_recommendToolbarIcon>svg{width:14px;height:14px}._LI32q_recommendHint{color:var(--mkt-text2);flex:1;font-size:12px;line-height:1.5}._LI32q_modeSwitchRow{margin-bottom:4px;display:flex}._LI32q_quizCard{background:#fff;border:1px solid #e5e7eb;border-radius:11px;flex-direction:column;margin-bottom:4px;padding:15px;display:flex;box-shadow:0 1px 3px #0000000f}._LI32q_quizHead{align-items:center;gap:8px;margin-bottom:4px;display:flex}._LI32q_quizHeadIcon{color:#4d6bfe;align-items:center;display:flex}._LI32q_quizHeadIcon>svg{width:16px;height:16px}._LI32q_quizTitle{flex:1;font-size:14px;font-weight:600}._LI32q_quizDesc{color:var(--mkt-text2);margin:0 0 12px;font-size:12px}._LI32q_quizTags{flex-wrap:wrap;gap:6px;margin-bottom:14px;display:flex}._LI32q_quizChip{color:var(--mkt-text2);cursor:pointer;user-select:none;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:5px 11px;font-size:12px;transition:all .14s}._LI32q_quizChip:hover{border-color:var(--mkt-brand-soft);color:#4d6bfe}._LI32q_quizChipOn{border-color:var(--mkt-brand-soft);color:var(--mkt-brand-strong);background:#eaf2fb;font-weight:500}._LI32q_quizActions{align-items:center;gap:8px;display:flex}._LI32q_quizCount{color:#8a919f;font-size:12px}._LI32q_quizCta{align-items:center;margin-left:auto;display:flex}._LI32q_quizCta ._LI32q_btnPrimary{padding:9px 14px;font-size:13px;font-weight:600}._LI32q_sceneList{flex-direction:column;gap:0;display:flex}._LI32q_sceneRow{border:1px solid #e5e7eb;border-radius:11px;align-items:center;gap:10px;margin-bottom:9px;padding:12px 13px;transition:box-shadow .15s,transform .15s;display:flex;box-shadow:0 1px 3px #0000000f}._LI32q_sceneRow:hover{transform:translateY(-1px);box-shadow:0 2px 8px #0000001a}._LI32q_sceneInfo{flex:1;min-width:0}._LI32q_sceneName{margin-bottom:3px;font-size:13.5px;font-weight:600}._LI32q_sceneDesc{color:var(--mkt-text2);font-size:12px;line-height:1.5}._LI32q_sceneHint{color:#8a919f;font-size:12px}._LI32q_sceneEmpty{color:#8a919f;border:1px solid #e5e7eb;border-radius:11px;margin:0;padding:12px 13px;font-size:12px}._LI32q_stateHint{text-align:center;color:#8a919f;padding:24px 12px;font-size:12px}._LI32q_installedNote{color:#8a919f;margin-top:8px;font-size:11px}._LI32q_grid2{grid-template-columns:1fr 1fr;align-items:start;gap:12px;display:grid}._LI32q_grid2>*{min-width:0;max-width:100%}@media (width<=480px){._LI32q_grid2{grid-template-columns:1fr}}._LI32q_searchWrap{margin-bottom:14px;position:relative}._LI32q_searchWrapIcon{color:#8a919f;pointer-events:none;align-items:center;width:15px;height:15px;display:flex;position:absolute;top:50%;left:11px;transform:translateY(-50%)}._LI32q_searchWrapIcon>svg{width:15px;height:15px}._LI32q_searchInput{border:1px solid var(--mkt-border-strong);width:100%;height:38px;color:var(--mkt-text);background:#fff;border-radius:10px;outline:none;padding:0 34px;font-family:inherit;font-size:13px;transition:border-color .16s,box-shadow .16s}._LI32q_searchInput::placeholder{color:var(--mkt-text2)}._LI32q_searchInput:focus{border-color:#4d6bfe;box-shadow:0 0 0 3px #4d6bfe24}._LI32q_searchClear{cursor:pointer;color:#8a919f;background:0 0;border:none;border-radius:5px;justify-content:center;align-items:center;width:20px;height:20px;padding:0;display:flex;position:absolute;top:50%;right:9px;transform:translateY(-50%)}._LI32q_searchClear:hover{background:#f3f4f6}._LI32q_searchClear svg{width:13px;height:13px}._LI32q_filterRow{flex-wrap:wrap;gap:6px;margin-bottom:14px;display:flex}._LI32q_filterChip{color:var(--mkt-text2);cursor:pointer;user-select:none;background:#fff;border:1px solid #e5e7eb;border-radius:13px;padding:4px 11px;font-size:12px;transition:all .14s}._LI32q_filterChip:hover{color:#4d6bfe;border-color:var(--mkt-brand-soft)}._LI32q_filterChipOn{border-color:var(--mkt-brand-soft);color:var(--mkt-brand-strong);background:#eaf2fb;font-weight:500}._LI32q_zhChip{color:#0f6e56;cursor:pointer;user-select:none;background:#e1f5ee;border:1px solid #9fe1cb;border-radius:13px;padding:4px 11px;font-size:12px;transition:all .14s}._LI32q_zhChip:hover{border-color:#1d9e75}._LI32q_zhChipOn{color:#fff;background:#0f6e56;border-color:#0f6e56;font-weight:500}._LI32q_zhChipCount{opacity:.75;margin-left:3px;font-size:10px}._LI32q_zhCatLabel{color:#8a919f;align-self:center;font-size:12px}._LI32q_semanticToggle{background:#fff;border:1px solid #e5e7eb;border-radius:11px;align-items:center;gap:9px;margin-bottom:14px;padding:9px 12px;display:flex}._LI32q_semanticInfo{flex:1}._LI32q_semanticTitle{align-items:center;gap:6px;font-size:13px;font-weight:600;display:flex}._LI32q_semanticPill{color:#8a919f;border:1px solid #e5e7eb;border-radius:9px;padding:0 6px;font-size:10px;font-weight:500}._LI32q_semanticDesc{color:#8a919f;margin-top:2px;font-size:12px}._LI32q_semanticSwitch{background:var(--mkt-border-strong);cursor:not-allowed;opacity:.7;border-radius:10px;flex:none;width:34px;height:20px;position:relative}._LI32q_semanticSwitch:after{content:\"\";background:#fff;border-radius:50%;width:16px;height:16px;position:absolute;top:2px;left:2px;box-shadow:0 1px 2px #0003}._LI32q_hotTagsTitle{color:#8a919f;margin-bottom:8px;font-size:12px}._LI32q_tagCloud{flex-wrap:wrap;gap:6px;padding:0;display:flex}._LI32q_hotTag{color:var(--mkt-text2);cursor:pointer;user-select:none;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:5px 11px;font-size:12px;transition:all .14s}._LI32q_hotTag:hover{border-color:var(--mkt-brand-soft);color:#4d6bfe}._LI32q_hotTagOn{border-color:var(--mkt-brand-soft);color:var(--mkt-brand-strong);background:#eaf2fb;font-weight:500}._LI32q_tagMoreRow{margin:2px 0 4px}._LI32q_results{grid-template-columns:1fr 1fr;align-items:start;gap:12px;display:grid}._LI32q_results>*{min-width:0;max-width:100%}@media (width<=480px){._LI32q_results{grid-template-columns:1fr}}._LI32q_resultCount{color:var(--mkt-text2);margin:2px 0 10px;font-size:12px}._LI32q_resultCount b{color:var(--mkt-text)}._LI32q_loadMoreRow{text-align:center;margin:14px 0 6px}._LI32q_loadMore{color:var(--mkt-text);cursor:pointer;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:6px 14px;font-family:inherit;font-size:12.5px;font-weight:500;transition:background-color .14s,border-color .14s;box-shadow:0 1px 3px #0000000f}._LI32q_loadMore:hover{border-color:var(--mkt-border-strong);background:#f3f4f6}._LI32q_semanticResult{color:#8a919f;flex-wrap:wrap;align-items:center;gap:5px;font-size:12px;display:flex}._LI32q_emptyState{text-align:center;padding:56px 20px}._LI32q_emptyIcon{color:var(--mkt-border-strong);justify-content:center;margin-bottom:12px;display:flex}._LI32q_emptyIcon>svg{width:44px;height:44px}._LI32q_emptyTitle{color:var(--mkt-text);margin-bottom:5px;font-size:14px;font-weight:600}._LI32q_emptyDesc{color:#8a919f;margin-bottom:16px;font-size:12px}._LI32q_installedRow{border:1px solid #e5e7eb;border-radius:11px;align-items:flex-start;gap:11px;margin-bottom:9px;padding:13px;transition:box-shadow .15s,transform .15s;display:flex;box-shadow:0 1px 3px #0000000f}._LI32q_installedRow:hover{transform:translateY(-1px);box-shadow:0 2px 8px #0000001a}._LI32q_installedInfo{flex:1;min-width:0}._LI32q_installedHead{align-items:center;gap:8px;display:flex}._LI32q_installedName{color:var(--mkt-text);text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;overflow:hidden}._LI32q_installedMeta{color:#8a919f;margin-top:3px;font-size:12px}._LI32q_installedActions{flex-direction:column;flex:none;gap:6px;display:flex}._LI32q_unmatched{flex-wrap:wrap;gap:5px;margin-top:8px;display:flex}._LI32q_unmatchedChip{background:var(--mkt-chip-warn-bg);border:1px dashed var(--mkt-chip-gold-border);color:var(--mkt-chip-warn-text);border-radius:10px;padding:3px 8px;font-size:11.5px}._LI32q_unmatchedMore{color:#8a919f;align-self:center;font-size:11px}._LI32q_updateChip{background:var(--mkt-chip-gold-bg);border:1px solid var(--mkt-chip-gold-border);color:var(--mkt-chip-gold-text);border-radius:10px;margin-top:5px;padding:1px 8px;font-size:11.5px;font-weight:500;display:inline-block}._LI32q_latestChip{background:var(--mkt-chip-green-bg);border:1px solid var(--mkt-chip-green-border);color:var(--mkt-chip-green-text);border-radius:10px;margin-top:5px;padding:1px 8px;font-size:11.5px;font-weight:500;display:inline-block}._LI32q_updateHint{color:#8a919f;margin-top:5px;font-size:11.5px}._LI32q_activationChip{background:var(--mkt-brand-tint);border:1px solid var(--mkt-brand-soft);color:#4d6bfe;border-radius:10px;margin-top:5px;padding:1px 8px;font-size:11.5px;font-weight:500;display:inline-block}._LI32q_activationLive{background:var(--mkt-chip-green-bg);border:1px solid var(--mkt-chip-green-border);color:var(--mkt-chip-green-text)}._LI32q_activationBroken{background:var(--mkt-chip-red-bg);border:1px solid var(--mkt-chip-red-border);color:var(--mkt-chip-red-text)}._LI32q_activationInert{border:1px solid var(--mkt-border-strong);color:var(--mkt-text3);background:#f3f4f6}._LI32q_selfUpdateBar{background:var(--mkt-chip-gold-bg);border:1px solid var(--mkt-chip-gold-border);color:var(--mkt-chip-gold-text);border-radius:10px;align-items:center;gap:8px;margin:0 14px 10px;padding:8px 12px;font-size:12px;display:flex}._LI32q_selfUpdateText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}._LI32q_settingCard{background:#fff;border:1px solid #e5e7eb;border-radius:11px;margin-bottom:12px;padding:15px;box-shadow:0 1px 3px #0000000f}._LI32q_settingHead{align-items:center;gap:8px;margin-bottom:10px;display:flex}._LI32q_settingIc{color:#4d6bfe;background:#f3f4f6;border-radius:8px;flex:none;justify-content:center;align-items:center;width:26px;height:26px;display:flex}._LI32q_settingIc>svg{width:15px;height:15px}._LI32q_settingTitle{font-size:14px;font-weight:600}._LI32q_versionRow{border-top:1px solid #eef0f2;align-items:center;gap:8px;margin-top:10px;padding-top:10px;display:flex}._LI32q_versionLabel{color:var(--mkt-text2);flex:none;font-size:12px}._LI32q_versionCode{color:var(--mkt-text);background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:2px 8px;font-family:ui-monospace,Menlo,monospace;font-size:12px}._LI32q_settingStatus{border-radius:9px;margin-left:auto;padding:2px 8px;font-size:11.5px}._LI32q_statusOk{background:var(--mkt-chip-green-bg);color:var(--mkt-text-ok)}._LI32q_statusOff{color:#8a919f;background:#f3f4f6}._LI32q_statusWarn{background:var(--mkt-chip-warn-bg);color:var(--mkt-chip-warn-text)}._LI32q_settingsRow{align-items:center;gap:8px;display:flex}._LI32q_settingsLabel{color:var(--mkt-text2);white-space:nowrap;font-size:12px}._LI32q_ghTip{color:var(--mkt-text2);margin:0;font-size:12px;line-height:1.7}._LI32q_ghLink{color:#4d6bfe;align-items:center;gap:2px;text-decoration:none;display:inline-flex}._LI32q_ghLink:hover{text-decoration:underline}._LI32q_ghLogin{flex:1;font-size:13px;font-weight:600}._LI32q_ghRow{align-items:center;gap:8px;display:flex}._LI32q_deviceFlow{color:var(--mkt-text2);background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;flex-direction:column;gap:6px;padding:9px 11px;font-size:12px;display:flex}._LI32q_deviceCode{letter-spacing:2px;color:#4d6bfe;background:#fff;border-radius:6px;align-self:flex-start;padding:4px 8px;font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:700}._LI32q_ghPollState{color:var(--mkt-text2);margin:0;font-size:12px}._LI32q_deviceFlow a{color:#4d6bfe}._LI32q_deviceFlowTip{color:#8a919f;margin:0;font-size:11.5px;line-height:1.6}._LI32q_ghDone{color:var(--mkt-text-ok);align-items:center;font-weight:500;display:inline-flex}._LI32q_field{margin-bottom:11px}._LI32q_fieldRow{gap:8px;display:flex}._LI32q_fieldRow>._LI32q_field{flex:1;margin-bottom:0}._LI32q_fieldLabel{color:var(--mkt-text2);margin-bottom:5px;font-size:12px;display:block}._LI32q_input,._LI32q_select{border:1px solid var(--mkt-border-strong);width:100%;height:34px;color:var(--mkt-text);background:#fff;border-radius:9px;outline:none;padding:0 10px;font-family:inherit;font-size:13px;transition:border-color .16s,box-shadow .16s}._LI32q_input:focus,._LI32q_select:focus{border-color:#4d6bfe;box-shadow:0 0 0 3px #4d6bfe24}._LI32q_input::placeholder{color:var(--mkt-text2)}._LI32q_error{color:var(--mkt-text-danger);margin:0;font-size:12px}._LI32q_warn{color:var(--mkt-chip-warn-text);align-items:center;margin:0;font-size:12px;display:flex}._LI32q_dividerLine{background:#eef0f2;height:1px;margin:13px 0}._LI32q_inlineIcon{vertical-align:-2px;flex:none;margin-right:4px;display:inline-block}._LI32q_modalBackdrop{z-index:120;background:#14161c6b;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}._LI32q_modal{background:#fff;border-radius:14px;flex-direction:column;width:420px;max-width:92vw;padding:20px 22px;display:flex;overflow:hidden;box-shadow:0 12px 50px #0000003d}._LI32q_modalHead{justify-content:space-between;align-items:center;margin-bottom:12px;display:flex}._LI32q_modalTitle{font-size:15px;font-weight:600}._LI32q_modalClose{cursor:pointer;color:#8a919f;background:0 0;border:none;border-radius:7px;justify-content:center;align-items:center;width:28px;height:28px;padding:0;transition:background-color .14s;display:flex}._LI32q_modalClose:hover{color:var(--mkt-text);background:#f3f4f6}._LI32q_modalClose svg{width:16px;height:16px}._LI32q_modalBody{flex-direction:column;gap:10px;display:flex}._LI32q_modalDesc{color:var(--mkt-text2);margin:0;font-size:12.5px;line-height:1.6}._LI32q_modalActions{justify-content:flex-end;gap:8px;margin-top:8px;display:flex}._LI32q_modalSuccess{text-align:center;flex-direction:column;justify-content:center;align-items:center;gap:10px;display:flex}._LI32q_modalSuccessIcon{background:var(--mkt-chip-green-bg);width:44px;height:44px;color:var(--mkt-text-ok);border-radius:50%;justify-content:center;align-items:center;margin:0 auto;display:flex}._LI32q_modalSuccessIcon>svg{width:22px;height:22px}._LI32q_modalSuccessTitle{color:var(--mkt-text);font-size:14px;font-weight:600}._LI32q_modalError{color:var(--mkt-text-danger);word-break:break-all;align-items:center;font-size:13px;font-weight:600;display:flex}._LI32q_loading{text-align:center;color:#8a919f;padding:20px;font-size:12px}._LI32q_advanced{margin-top:2px}._LI32q_advanced summary{cursor:pointer;color:#8a919f;user-select:none;font-size:11px}._LI32q_advancedTip{color:#8a919f;margin:6px 0 0;font-size:11px;line-height:1.5}._LI32q_advancedCmd{color:var(--mkt-text2);white-space:pre-wrap;word-break:break-all;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;margin-top:6px;padding:9px 11px;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.6;display:block}._LI32q_steps{align-items:center;margin-bottom:18px;display:flex}._LI32q_step{color:#8a919f;flex:1;align-items:center;gap:7px;font-size:12px;display:flex;position:relative}._LI32q_stepDot{border:1.5px solid var(--mkt-border-strong);color:#8a919f;background:#fff;border-radius:50%;flex:none;justify-content:center;align-items:center;width:20px;height:20px;font-size:11.5px;transition:all .2s;display:flex}._LI32q_stepActive{color:var(--mkt-text)}._LI32q_stepActive ._LI32q_stepDot{color:#4d6bfe;border-color:#4d6bfe}._LI32q_stepDone{color:var(--mkt-text)}._LI32q_stepDone ._LI32q_stepDot{color:#fff;background:#4d6bfe;border-color:#4d6bfe}._LI32q_stepBar{background:var(--mkt-border-strong);border-radius:1px;flex:1;height:1.5px;margin:0 6px}._LI32q_stepBarDone{background:#4d6bfe}._LI32q_toast{background:var(--mkt-inverse);color:#fff;z-index:200;pointer-events:none;border-radius:8px;padding:8px 16px;font-size:12.5px;animation:.22s _LI32q_toastIn;position:fixed;bottom:24px;left:50%;transform:translate(-50%);box-shadow:0 4px 16px #0003}@keyframes _LI32q_toastIn{0%{opacity:0;transform:translate(-50%)translateY(10px)}to{opacity:1;transform:translate(-50%)translateY(0)}}@media (prefers-color-scheme:dark){:root{--mkt-text:#e8eaed;--mkt-text2:#b3bac4;--mkt-text3:#a6aeba;--mkt-brand:#6d8bff;--mkt-brand-strong:#8aa5ff;--mkt-brand-tint:#6d8bff1a;--mkt-brand-soft:#6d8bff3d;--mkt-border:#2a2e36;--mkt-border-strong:#3a3f49;--mkt-divider:#262a31;--mkt-selected:#2e323a;--mkt-hover:#2a2e35;--mkt-bg:#171a1f;--mkt-inverse:#31353d;--mkt-surface-a:#1b1e24;--mkt-surface-b:#21252c;--mkt-surface-c:#262a32;--mkt-chip-warn-bg:#b4530929;--mkt-chip-warn-text:#fbbf24;--mkt-chip-gold-bg:#d9770629;--mkt-chip-gold-border:#d9770659;--mkt-chip-gold-text:#fbbf24;--mkt-chip-green-bg:#22c55e21;--mkt-chip-green-border:#22c55e4d;--mkt-chip-green-text:#4ade80;--mkt-chip-red-bg:#ef444421;--mkt-chip-red-border:#ef44444d;--mkt-chip-red-text:#f87171;--mkt-text-ok:#4ade80;--mkt-text-danger:#f87171;--mkt-rate-ok:#4ade80;--mkt-rate-warn:#fbbf24;--mkt-rate-danger:#f87171;--mkt-purple:#a78bfa;--mkt-purple-bg:#7c3aed29}._LI32q_panel{color-scheme:dark;box-shadow:0 8px 32px #00000080}}:root[style*=\"color-scheme: dark\"]{--mkt-text:#e8eaed;--mkt-text2:#9aa1a8;--mkt-text3:#8b93a1;--mkt-brand:#6d8bff;--mkt-brand-strong:#8aa5ff;--mkt-brand-tint:#6d8bff1a;--mkt-brand-soft:#6d8bff3d;--mkt-border:#2a2e36;--mkt-border-strong:#3a3f49;--mkt-divider:#262a31;--mkt-selected:#2e323a;--mkt-hover:#2a2e35;--mkt-bg:#171a1f;--mkt-inverse:#31353d;--mkt-surface-a:#1b1e24;--mkt-surface-b:#21252c;--mkt-surface-c:#262a32;--mkt-chip-warn-bg:#b4530929;--mkt-chip-warn-text:#fbbf24;--mkt-chip-gold-bg:#d9770629;--mkt-chip-gold-border:#d9770659;--mkt-chip-gold-text:#fbbf24;--mkt-chip-green-bg:#22c55e21;--mkt-chip-green-border:#22c55e4d;--mkt-chip-green-text:#4ade80;--mkt-chip-red-bg:#ef444421;--mkt-chip-red-border:#ef44444d;--mkt-chip-red-text:#f87171;--mkt-text-ok:#4ade80;--mkt-text-danger:#f87171;--mkt-rate-ok:#4ade80;--mkt-rate-warn:#fbbf24;--mkt-rate-danger:#f87171;--mkt-purple:#a78bfa;--mkt-purple-bg:#7c3aed29}:root[style*=\"color-scheme: dark\"] ._LI32q_panel{color-scheme:dark;box-shadow:0 8px 32px #00000080}:root[style*=\"color-scheme: dark\"] ._LI32q_trigger{color:#e8eaed}:root[style*=\"color-scheme: dark\"] ._LI32q_trigger:hover{color:#fff;background:#ffffff1a}:root[style*=\"color-scheme: dark\"] ._LI32q_trigger[data-active]{color:var(--mkt-brand);background:var(--mkt-hover)}._LI32q_panel{background:var(--mkt-surface-a)}._LI32q_card,._LI32q_settingCard,._LI32q_quizCard,._LI32q_modal{background:var(--mkt-surface-b)}._LI32q_btn,._LI32q_iconBtn,._LI32q_favBtn,._LI32q_repoBtn,._LI32q_quizChip,._LI32q_searchInput,._LI32q_filterChip,._LI32q_semanticToggle,._LI32q_semanticSwitch,._LI32q_hotTag,._LI32q_loadMore,._LI32q_deviceCode,._LI32q_select,._LI32q_stepDot{background:var(--mkt-surface-c)}._LI32q_btnPrimary,._LI32q_btnPrimary:hover,._LI32q_btnPrimary:active{background:var(--mkt-brand);border-color:var(--mkt-brand)}._LI32q_btnPrimary:hover{background:var(--mkt-brand-strong);border-color:var(--mkt-brand-strong)}._LI32q_btnDanger{background:var(--mkt-chip-red-bg);color:var(--mkt-text-danger);border-color:var(--mkt-chip-red-border)}._LI32q_outlet{border:1px solid var(--mkt-chip-red-border,#f3c9c9);text-align:center;background:#fff;border-radius:12px;max-width:460px;margin:18px auto;padding:20px 18px;box-shadow:0 1px 3px #0000000f}._LI32q_outletTitle{color:var(--mkt-text,#1f2328);margin-bottom:8px;font-size:14px;font-weight:600}._LI32q_outletMsg{max-width:420px;margin:0 auto 4px}._LI32q_outletMsg code{background:var(--mkt-chip-red-bg,#fdf1f1);color:var(--mkt-text-danger);word-break:break-all;text-align:left;white-space:pre-wrap;border-radius:8px;max-height:88px;padding:8px 10px;font-size:11.5px;line-height:1.5;display:block;overflow:auto}._LI32q_outletActions{flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px;display:flex}._LI32q_outletManual{text-align:left;margin-top:10px}._LI32q_outletManualTitle{color:var(--mkt-text,#1f2328);margin-bottom:4px;font-size:12px;font-weight:600}._LI32q_outletManualText{white-space:pre-wrap;word-break:break-all;cursor:copy;user-select:all;background:#f7f8fa;border:1px dashed #d0d4da;border-radius:8px;max-height:180px;margin:0;padding:8px 10px;font-size:11px;line-height:1.5;overflow:auto}._LI32q_outletHint{color:#8a919f;margin-top:12px;font-size:11px;line-height:1.6}._LI32q_semanticSwitch{cursor:pointer;opacity:1;transition:background .15s}._LI32q_semanticSwitchOn{background:var(--mkt-brand)}._LI32q_semanticSwitchOn:after{left:16px}";
		const tagId = "@dsh-market/plugin/styles.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-market/plugin";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var styles_module_css_default = {
			"select": "_LI32q_select",
			"versionRow": "_LI32q_versionRow",
			"advancedTip": "_LI32q_advancedTip",
			"steps": "_LI32q_steps",
			"tab": "_LI32q_tab",
			"searchInput": "_LI32q_searchInput",
			"body": "_LI32q_body",
			"stepBarDone": "_LI32q_stepBarDone",
			"quizHeadIcon": "_LI32q_quizHeadIcon",
			"quizActions": "_LI32q_quizActions",
			"btnSm": "_LI32q_btnSm",
			"quizCount": "_LI32q_quizCount",
			"tabBody": "_LI32q_tabBody",
			"sceneDesc": "_LI32q_sceneDesc",
			"versionCode": "_LI32q_versionCode",
			"statusOff": "_LI32q_statusOff",
			"activationChip": "_LI32q_activationChip",
			"resultCount": "_LI32q_resultCount",
			"btn": "_LI32q_btn",
			"quizCta": "_LI32q_quizCta",
			"sceneHint": "_LI32q_sceneHint",
			"loadMoreRow": "_LI32q_loadMoreRow",
			"ghLogin": "_LI32q_ghLogin",
			"field": "_LI32q_field",
			"activationLive": "_LI32q_activationLive",
			"deviceFlow": "_LI32q_deviceFlow",
			"advanced": "_LI32q_advanced",
			"activationInert": "_LI32q_activationInert",
			"settingStatus": "_LI32q_settingStatus",
			"filterChipOn": "_LI32q_filterChipOn",
			"zhChip": "_LI32q_zhChip",
			"sceneInfo": "_LI32q_sceneInfo",
			"settingIc": "_LI32q_settingIc",
			"modalBackdrop": "_LI32q_modalBackdrop",
			"recommendHint": "_LI32q_recommendHint",
			"installedHead": "_LI32q_installedHead",
			"selfUpdateBar": "_LI32q_selfUpdateBar",
			"outletMsg": "_LI32q_outletMsg",
			"statusOk": "_LI32q_statusOk",
			"repoBtn": "_LI32q_repoBtn",
			"warn": "_LI32q_warn",
			"cardDesc": "_LI32q_cardDesc",
			"modalError": "_LI32q_modalError",
			"triggerLabel": "_LI32q_triggerLabel",
			"unmatched": "_LI32q_unmatched",
			"outletTitle": "_LI32q_outletTitle",
			"favBtnOn": "_LI32q_favBtnOn",
			"zhCatLabel": "_LI32q_zhCatLabel",
			"unmatchedChip": "_LI32q_unmatchedChip",
			"stateHint": "_LI32q_stateHint",
			"emptyIcon": "_LI32q_emptyIcon",
			"outletManualTitle": "_LI32q_outletManualTitle",
			"filterChip": "_LI32q_filterChip",
			"searchClear": "_LI32q_searchClear",
			"tagCloud": "_LI32q_tagCloud",
			"cardTags": "_LI32q_cardTags",
			"title": "_LI32q_title",
			"dividerLine": "_LI32q_dividerLine",
			"tabOn": "_LI32q_tabOn",
			"sceneRow": "_LI32q_sceneRow",
			"zhChipCount": "_LI32q_zhChipCount",
			"hotTagOn": "_LI32q_hotTagOn",
			"cardHead": "_LI32q_cardHead",
			"modalTitle": "_LI32q_modalTitle",
			"modalSuccess": "_LI32q_modalSuccess",
			"installedMeta": "_LI32q_installedMeta",
			"versionLabel": "_LI32q_versionLabel",
			"updateHint": "_LI32q_updateHint",
			"deviceCode": "_LI32q_deviceCode",
			"modal": "_LI32q_modal",
			"toastIn": "_LI32q_toastIn",
			"outletHint": "_LI32q_outletHint",
			"sectionIcon": "_LI32q_sectionIcon",
			"tabs": "_LI32q_tabs",
			"sceneList": "_LI32q_sceneList",
			"settingsRow": "_LI32q_settingsRow",
			"settingsLabel": "_LI32q_settingsLabel",
			"titleIcon": "_LI32q_titleIcon",
			"installedNote": "_LI32q_installedNote",
			"section": "_LI32q_section",
			"cardReasons": "_LI32q_cardReasons",
			"searchWrapIcon": "_LI32q_searchWrapIcon",
			"modalBody": "_LI32q_modalBody",
			"tagOn": "_LI32q_tagOn",
			"ghTip": "_LI32q_ghTip",
			"loadMore": "_LI32q_loadMore",
			"installedActions": "_LI32q_installedActions",
			"sectionTitle": "_LI32q_sectionTitle",
			"settingCard": "_LI32q_settingCard",
			"grid2": "_LI32q_grid2",
			"iconBtn": "_LI32q_iconBtn",
			"trigger": "_LI32q_trigger",
			"cardBadge": "_LI32q_cardBadge",
			"emptyTitle": "_LI32q_emptyTitle",
			"inlineIcon": "_LI32q_inlineIcon",
			"stepDone": "_LI32q_stepDone",
			"latestChip": "_LI32q_latestChip",
			"semanticTitle": "_LI32q_semanticTitle",
			"toast": "_LI32q_toast",
			"zhChipOn": "_LI32q_zhChipOn",
			"emptyState": "_LI32q_emptyState",
			"outlet": "_LI32q_outlet",
			"loading": "_LI32q_loading",
			"header": "_LI32q_header",
			"outletManualText": "_LI32q_outletManualText",
			"btnGhost": "_LI32q_btnGhost",
			"updateChip": "_LI32q_updateChip",
			"mainHost": "_LI32q_mainHost",
			"ghPollState": "_LI32q_ghPollState",
			"fieldRow": "_LI32q_fieldRow",
			"quizHead": "_LI32q_quizHead",
			"hotTag": "_LI32q_hotTag",
			"hotTagsTitle": "_LI32q_hotTagsTitle",
			"emptyDesc": "_LI32q_emptyDesc",
			"searchWrap": "_LI32q_searchWrap",
			"modalDesc": "_LI32q_modalDesc",
			"btnDanger": "_LI32q_btnDanger",
			"btnPrimary": "_LI32q_btnPrimary",
			"advancedCmd": "_LI32q_advancedCmd",
			"fieldLabel": "_LI32q_fieldLabel",
			"subtitle": "_LI32q_subtitle",
			"modalSuccessTitle": "_LI32q_modalSuccessTitle",
			"favBtn": "_LI32q_favBtn",
			"installedName": "_LI32q_installedName",
			"quizChip": "_LI32q_quizChip",
			"selfUpdateText": "_LI32q_selfUpdateText",
			"sectionHead": "_LI32q_sectionHead",
			"stepBar": "_LI32q_stepBar",
			"ghLink": "_LI32q_ghLink",
			"quizCard": "_LI32q_quizCard",
			"cardStars": "_LI32q_cardStars",
			"quizDesc": "_LI32q_quizDesc",
			"compatChip": "_LI32q_compatChip",
			"reasonAi": "_LI32q_reasonAi",
			"cardActions": "_LI32q_cardActions",
			"spacer": "_LI32q_spacer",
			"results": "_LI32q_results",
			"triggerIcon": "_LI32q_triggerIcon",
			"semanticInfo": "_LI32q_semanticInfo",
			"settingTitle": "_LI32q_settingTitle",
			"deviceFlowTip": "_LI32q_deviceFlowTip",
			"backdrop": "_LI32q_backdrop",
			"sectionNote": "_LI32q_sectionNote",
			"activationBroken": "_LI32q_activationBroken",
			"filterRow": "_LI32q_filterRow",
			"modalActions": "_LI32q_modalActions",
			"cardName": "_LI32q_cardName",
			"modalSuccessIcon": "_LI32q_modalSuccessIcon",
			"recommendToolbarIcon": "_LI32q_recommendToolbarIcon",
			"step": "_LI32q_step",
			"outletManual": "_LI32q_outletManual",
			"panel": "_LI32q_panel",
			"ghRow": "_LI32q_ghRow",
			"modalClose": "_LI32q_modalClose",
			"semanticPill": "_LI32q_semanticPill",
			"outletActions": "_LI32q_outletActions",
			"modeSwitchRow": "_LI32q_modeSwitchRow",
			"quizTitle": "_LI32q_quizTitle",
			"sceneName": "_LI32q_sceneName",
			"installedRow": "_LI32q_installedRow",
			"semanticSwitchOn": "_LI32q_semanticSwitchOn",
			"panelInMain": "_LI32q_panelInMain",
			"sceneEmpty": "_LI32q_sceneEmpty",
			"semanticToggle": "_LI32q_semanticToggle",
			"semanticSwitch": "_LI32q_semanticSwitch",
			"tagMoreRow": "_LI32q_tagMoreRow",
			"settingHead": "_LI32q_settingHead",
			"cardActionHint": "_LI32q_cardActionHint",
			"installedInfo": "_LI32q_installedInfo",
			"semanticDesc": "_LI32q_semanticDesc",
			"statusWarn": "_LI32q_statusWarn",
			"input": "_LI32q_input",
			"error": "_LI32q_error",
			"ghDone": "_LI32q_ghDone",
			"tag": "_LI32q_tag",
			"unmatchedMore": "_LI32q_unmatchedMore",
			"reason": "_LI32q_reason",
			"semanticResult": "_LI32q_semanticResult",
			"stepDot": "_LI32q_stepDot",
			"modalHead": "_LI32q_modalHead",
			"iconBtnOn": "_LI32q_iconBtnOn",
			"needConfig": "_LI32q_needConfig",
			"stepActive": "_LI32q_stepActive",
			"quizTags": "_LI32q_quizTags",
			"headerClose": "_LI32q_headerClose",
			"quizChipOn": "_LI32q_quizChipOn",
			"card": "_LI32q_card",
			"recommendToolbar": "_LI32q_recommendToolbar"
		};
		//#endregion
		//#region src/client/error-outlet.tsx
		/**
		* P12 崩溃"出路"：错误边界 + 出路面板。
		*
		* 原则：**崩溃必须渲染可操作的面板，永远不是空白页。**
		*
		* - `Boundary`：React 错误边界（class 组件是 React 官方唯一形式）。使用方式：
		*   每个 Tab 一个实例（key 绑定 Tab id，切 Tab 自动重置）、安装弹窗一个、
		*   面板整体再兜底一个——单点崩溃不拖累其他区域，整体崩溃仍有一张"出路卡"。
		* - `ErrorOutlet`：错误信息 + 三个动作：重试 / 复制诊断 / 复制修复提示词。
		*   诊断快照来自 Host RPC `diag:snapshot`（只读本地，见 core/src/diag.ts）；
		*   RPC 也失败时降级为仅错误信息——出路永远可用。
		*   复制走 clipboard；clipboard 不可用时把文本展开成可手选的 <pre>（webview 里禁剪贴板也能自救）。
		*/
		function El$1(tag, props, ...children) {
			return (0, react.createElement)(tag, props ?? {}, ...children);
		}
		/** 错误边界：内部状态 error 非空时渲染出路面板，否则渲染 children */
		var Boundary = class extends react.Component {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error, info) {
				console.error(`[market] ${this.props.label} 崩溃:`, error, info);
			}
			render() {
				if (this.state.error) return El$1(ErrorOutlet, {
					error: this.state.error,
					label: this.props.label,
					onRetry: () => this.setState({ error: null })
				});
				return this.props.children;
			}
		};
		/** 截断长文本（堆栈只留头几行，诊断信息够定位即可，不灌满剪贴板） */
		function truncate(s, max) {
			return s.length > max ? `${s.slice(0, max)}…（截断）` : s;
		}
		/** 组装诊断全文（RPC 失败时降级：仍带上客户端已知的错误与位置）。P6 安装弹窗「复制诊断」复用。 */
		async function buildDiagnostics(label, error) {
			return buildDiagText(label, error);
		}
		/** 组装诊断全文（RPC 失败时降级：仍带上客户端已知的错误与位置） */
		async function buildDiagText(label, error) {
			let snap = "";
			try {
				const s = await api("diag:snapshot");
				snap = JSON.stringify(s, null, 2);
			} catch (e) {
				snap = `（诊断 RPC 失败：${e.message}——Host 可能已无响应）`;
			}
			return [
				"【插件市场诊断】",
				`出错位置: ${label}`,
				`时间: ${(/* @__PURE__ */ new Date()).toISOString()}`,
				"",
				"— 环境（Host 侧快照）—",
				snap,
				"",
				"— 错误 —",
				`${error.name}: ${error.message}`,
				error instanceof RpcError && error.classified ? `分类: ${error.classified.code} — ${error.classified.title}\n建议: ${error.classified.hint}` : "",
				error.stack ? truncate(error.stack, 1200) : "（无堆栈）"
			].filter((l) => l !== "").join("\n");
		}
		/** 修复提示词：把诊断嵌进一段可直接粘贴给 AI 的话 */
		async function buildFixPrompt(label, error) {
			const diag = await buildDiagText(label, error);
			return [
				"我在用 DSH（deepseek harness）的插件市场插件，面板的「" + label + "」渲染崩溃了。",
				"下面是自动导出的诊断信息。",
				"",
				"请：1) 分析最可能的原因；2) 给我一步步的修复命令——",
				"优先给不改配置就能解决的方案；涉及 dsh CLI 的请给完整命令行；",
				"如果是插件自身 bug，请说明我能用哪个临时绕过办法。",
				"",
				"====== 诊断开始 ======",
				diag,
				"====== 诊断结束 ======"
			].join("\n");
		}
		/** 写剪贴板；不可用返回 false（调用方降级为手动复制）。P6 设置 Tab 导出日志复用。 */
		async function copyText(text) {
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
					await navigator.clipboard.writeText(text);
					return true;
				}
			} catch {}
			return false;
		}
		/** 出路面板：崩溃时渲染的可操作卡片 */
		function ErrorOutlet(props) {
			const { error, label, onRetry } = props;
			const [copied, setCopied] = (0, react.useState)("");
			const [manual, setManual] = (0, react.useState)(null);
			const copy = async (kind) => {
				const text = kind === "diag" ? await buildDiagText(label, error) : await buildFixPrompt(label, error);
				if (await copyText(text)) {
					setCopied(kind);
					setTimeout(() => setCopied(""), 2e3);
				} else setManual({
					title: kind === "diag" ? "诊断信息（手动全选复制）" : "修复提示词（手动全选复制）",
					text
				});
			};
			return El$1("div", { className: styles_module_css_default.outlet }, El$1("div", { className: styles_module_css_default.outletTitle }, "这里出了点问题，但不是死路"), El$1("div", { className: styles_module_css_default.outletMsg }, El$1("code", null, truncate(`${error.name}: ${error.message}`, 200))), El$1("div", { className: styles_module_css_default.outletActions }, El$1("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary} ${styles_module_css_default.btnSm}`,
				onClick: onRetry
			}, "重试"), El$1("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				onClick: () => void copy("diag")
			}, copied === "diag" ? "已复制 ✓" : "复制诊断"), El$1("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnGhost} ${styles_module_css_default.btnSm}`,
				onClick: () => void copy("prompt")
			}, copied === "prompt" ? "已复制 ✓" : "复制修复提示词")), manual ? El$1("div", { className: styles_module_css_default.outletManual }, El$1("div", { className: styles_module_css_default.outletManualTitle }, manual.title), El$1("pre", {
				className: styles_module_css_default.outletManualText,
				onClick: (e) => e.target.textContent && void copyText(e.target.textContent || "")
			}, manual.text)) : null, El$1("div", { className: styles_module_css_default.outletHint }, "诊断只包含版本/环境与错误信息，不含对话内容与密钥。反复崩溃可到设置 Tab 检查插件更新。"));
		}
		//#endregion
		//#region ../../schema/dist/zh-intent.js
		const ZH_INTENTS = [
			{
				key: "记事本",
				words: [
					"记事本",
					"便签",
					"笔记本",
					"记事",
					"笔记"
				],
				terms: [
					"#notes",
					"#note",
					"#notepad",
					"便签",
					"笔记",
					"markdown"
				]
			},
			{
				key: "待办",
				words: [
					"待办",
					"任务管理",
					"清单",
					"todo"
				],
				terms: [
					"#todo",
					"#task",
					"#checklist",
					"待办",
					"任务",
					"清单",
					"任务看板",
					"#kanban"
				]
			},
			{
				key: "翻译",
				words: ["翻译", "translate"],
				terms: [
					"#translate",
					"#translation",
					"翻译"
				]
			},
			{
				key: "截图",
				words: [
					"截图",
					"截屏",
					"录屏",
					"屏幕录制",
					"长图"
				],
				terms: [
					"#screenshot",
					"#capture",
					"#screen",
					"截图",
					"录屏",
					"截图工具",
					"长图"
				]
			},
			{
				key: "下载",
				words: ["下载"],
				terms: [
					"#download",
					"#downloader",
					"下载"
				]
			},
			{
				key: "天气",
				words: ["天气"],
				terms: ["#weather", "天气"]
			},
			{
				key: "日历日程",
				words: [
					"日历",
					"日程",
					"闹钟",
					"时钟"
				],
				terms: [
					"#calendar",
					"#schedule",
					"#clock",
					"#alarm",
					"日历",
					"日程",
					"时钟"
				]
			},
			{
				key: "提醒",
				words: ["提醒", "通知"],
				terms: [
					"#remind",
					"#reminder",
					"#notification",
					"#notify",
					"提醒",
					"消息通知"
				]
			},
			{
				key: "聊天",
				words: [
					"聊天",
					"对话",
					"陪聊"
				],
				terms: [
					"#chat",
					"#chatbot",
					"聊天",
					"对话"
				]
			},
			{
				key: "邮件",
				words: ["邮件", "邮箱"],
				terms: [
					"#mail",
					"#email",
					"#smtp",
					"邮件"
				]
			},
			{
				key: "文件管理",
				words: [
					"文件管理",
					"资源管理",
					"文件整理",
					"整理文件",
					"整理",
					"重命名"
				],
				terms: [
					"#file",
					"#files",
					"#explorer",
					"文件",
					"#rename",
					"#renamer",
					"重命名"
				]
			},
			{
				key: "图片",
				words: [
					"图片",
					"相册",
					"壁纸",
					"水印"
				],
				terms: [
					"#image",
					"#images",
					"#photo",
					"#wallpaper",
					"图片",
					"壁纸",
					"相册",
					"视觉理解",
					"图像识别",
					"图片问答",
					"图像处理",
					"水印"
				]
			},
			{
				key: "绘画",
				words: [
					"画图",
					"绘画",
					"生图",
					"文生图",
					"画"
				],
				terms: [
					"#draw",
					"#drawing",
					"stable-diffusion",
					"#image-generation",
					"绘画",
					"生图"
				]
			},
			{
				key: "音乐",
				words: [
					"音乐",
					"歌曲",
					"听歌"
				],
				terms: [
					"#music",
					"#audio",
					"音乐"
				]
			},
			{
				key: "视频",
				words: ["视频"],
				terms: [
					"#video",
					"视频",
					"剪辑"
				]
			},
			{
				key: "播放器",
				words: ["播放器"],
				terms: ["#player", "播放器"]
			},
			{
				key: "浏览器",
				words: [
					"浏览器",
					"网页",
					"上网"
				],
				terms: [
					"#browser",
					"#web",
					"浏览器",
					"网页"
				]
			},
			{
				key: "搜索引擎",
				words: ["搜索引擎"],
				terms: [
					"#search",
					"search-engine",
					"搜索"
				]
			},
			{
				key: "代码开发",
				words: [
					"代码",
					"编程",
					"开发"
				],
				terms: [
					"#code",
					"#coding",
					"#dev",
					"代码",
					"编程"
				]
			},
			{
				key: "Git",
				words: [
					"git",
					"github",
					"gitee",
					"提交"
				],
				terms: [
					"#git",
					"#github",
					"#gitee",
					"#commit",
					"版本控制"
				]
			},
			{
				key: "终端",
				words: [
					"终端",
					"命令行",
					"shell"
				],
				terms: [
					"#terminal",
					"#shell",
					"#cli",
					"终端",
					"命令行"
				]
			},
			{
				key: "数据库",
				words: ["数据库", "sql"],
				terms: [
					"#database",
					"#sql",
					"sqlite",
					"mysql",
					"数据库",
					"数据库连接"
				]
			},
			{
				key: "爬虫",
				words: ["爬虫", "抓取"],
				terms: [
					"#crawler",
					"#scraper",
					"#spider",
					"爬虫",
					"抓取"
				]
			},
			{
				key: "自动化",
				words: ["自动化", "rpa"],
				terms: [
					"#automation",
					"#automate",
					"#workflow",
					"任务编排",
					"桌面自动化"
				]
			},
			{
				key: "剪贴板",
				words: ["剪贴板"],
				terms: ["#clipboard", "剪贴板"]
			},
			{
				key: "压缩",
				words: ["压缩", "解压"],
				terms: [
					"#zip",
					"#compress",
					"#archive",
					"压缩",
					"解压"
				]
			},
			{
				key: "PDF",
				words: ["pdf"],
				terms: ["#pdf"]
			},
			{
				key: "办公文档",
				words: [
					"word",
					"excel",
					"ppt",
					"表格",
					"幻灯片",
					"演示"
				],
				terms: [
					"#excel",
					"#word",
					"#office",
					"#xlsx",
					"表格",
					"幻灯片",
					"#ppt"
				]
			},
			{
				key: "网盘",
				words: ["网盘", "云盘"],
				terms: [
					"#cloud",
					"#drive",
					"网盘",
					"云盘",
					"#onedrive"
				]
			},
			{
				key: "密码",
				words: ["密码"],
				terms: ["#password", "密码"]
			},
			{
				key: "加密",
				words: ["加密", "解密"],
				terms: [
					"#encrypt",
					"#crypto",
					"加密"
				]
			},
			{
				key: "代理网络",
				words: [
					"代理",
					"梯子",
					"组网"
				],
				terms: [
					"#proxy",
					"#network",
					"代理",
					"网络",
					"网络代理",
					"内网穿透"
				]
			},
			{
				key: "网络诊断",
				words: [
					"ip",
					"端口",
					"ping"
				],
				terms: [
					"#ip",
					"#port",
					"#tcp",
					"#udp",
					"#ping",
					"端口"
				]
			},
			{
				key: "系统进程",
				words: [
					"系统",
					"进程",
					"任务管理"
				],
				terms: [
					"#system",
					"#process",
					"系统",
					"进程"
				]
			},
			{
				key: "清理",
				words: [
					"清理",
					"垃圾",
					"瘦身"
				],
				terms: [
					"#clean",
					"#cleanup",
					"清理",
					"垃圾"
				]
			},
			{
				key: "监控",
				words: ["监控"],
				terms: ["#monitor", "监控"]
			},
			{
				key: "日志",
				words: ["日志"],
				terms: [
					"#log",
					"#logs",
					"日志"
				]
			},
			{
				key: "番茄钟",
				words: [
					"番茄钟",
					"专注",
					"计时"
				],
				terms: [
					"#pomodoro",
					"#focus",
					"#timer",
					"番茄钟",
					"专注",
					"计时"
				]
			},
			{
				key: "计算换算",
				words: [
					"计算器",
					"换算",
					"单位",
					"格式转换"
				],
				terms: [
					"#calculator",
					"#convert",
					"计算器",
					"换算",
					"数学计算"
				]
			},
			{
				key: "汇率",
				words: ["汇率", "货币"],
				terms: [
					"#exchange",
					"#currency",
					"汇率"
				]
			},
			{
				key: "股票基金",
				words: [
					"股票",
					"基金",
					"a股",
					"行情",
					"炒股"
				],
				terms: [
					"#stock",
					"#finance",
					"股票",
					"基金",
					"行情"
				]
			},
			{
				key: "加密货币",
				words: [
					"比特币",
					"加密货币",
					"币圈"
				],
				terms: [
					"#bitcoin",
					"#crypto",
					"#blockchain",
					"加密货币"
				]
			},
			{
				key: "AI大模型",
				words: [
					"大模型",
					"llm",
					"gpt",
					"智能体",
					"人工智能"
				],
				terms: [
					"#ai",
					"#llm",
					"#gpt",
					"#agent",
					"大模型",
					"人工智能"
				]
			},
			{
				key: "机器人",
				words: ["机器人"],
				terms: [
					"#bot",
					"#robot",
					"机器人"
				]
			},
			{
				key: "问卷投票",
				words: [
					"问卷",
					"投票",
					"抽奖"
				],
				terms: [
					"#survey",
					"#poll",
					"#quiz",
					"问卷",
					"投票",
					"抽奖"
				]
			},
			{
				key: "游戏",
				words: ["游戏", "摸鱼"],
				terms: [
					"#game",
					"#games",
					"游戏"
				]
			},
			{
				key: "娱乐",
				words: [
					"娱乐",
					"段子",
					"笑话"
				],
				terms: [
					"#fun",
					"#joke",
					"#meme",
					"娱乐",
					"段子"
				]
			},
			{
				key: "新闻资讯",
				words: [
					"新闻",
					"资讯",
					"头条",
					"热搜"
				],
				terms: [
					"#news",
					"#feed",
					"#trending",
					"新闻",
					"资讯",
					"热搜",
					"新闻聚合"
				]
			},
			{
				key: "RSS订阅",
				words: ["rss", "订阅"],
				terms: [
					"#rss",
					"#feed",
					"订阅"
				]
			},
			{
				key: "阅读",
				words: [
					"阅读",
					"电子书",
					"小说"
				],
				terms: [
					"#read",
					"#reader",
					"#ebook",
					"#novel",
					"#epub",
					"阅读",
					"小说"
				]
			},
			{
				key: "学习背词",
				words: [
					"学习",
					"背单词",
					"单词",
					"英语"
				],
				terms: [
					"#learn",
					"#study",
					"#vocabulary",
					"#english",
					"学习",
					"单词",
					"英语"
				]
			},
			{
				key: "论文文献",
				words: [
					"论文",
					"文献",
					"学术"
				],
				terms: [
					"#paper",
					"#arxiv",
					"#scholar",
					"论文",
					"文献"
				]
			},
			{
				key: "知识库",
				words: [
					"知识库",
					"维基",
					"wiki"
				],
				terms: [
					"#wiki",
					"#knowledge",
					"知识库",
					"维基"
				]
			},
			{
				key: "白板",
				words: ["白板", "画布"],
				terms: [
					"#whiteboard",
					"#canvas",
					"白板",
					"画布"
				]
			},
			{
				key: "思维导图",
				words: ["思维导图"],
				terms: [
					"#mindmap",
					"#mind",
					"思维导图"
				]
			},
			{
				key: "流程图",
				words: [
					"流程图",
					"图表",
					"绘图"
				],
				terms: [
					"#diagram",
					"#flowchart",
					"#mermaid",
					"流程图",
					"图表"
				]
			},
			{
				key: "OCR",
				words: ["ocr", "文字识别"],
				terms: ["#ocr", "文字识别"]
			},
			{
				key: "语音合成",
				words: [
					"语音",
					"朗读",
					"tts",
					"配音",
					"声音克隆",
					"克隆声音"
				],
				terms: [
					"#tts",
					"#speech",
					"#voice",
					"语音",
					"朗读",
					"声音克隆"
				]
			},
			{
				key: "语音识别",
				words: [
					"语音识别",
					"听写",
					"whisper"
				],
				terms: [
					"#whisper",
					"#asr",
					"#stt",
					"语音识别",
					"听写",
					"语音输入"
				]
			},
			{
				key: "字幕",
				words: ["字幕"],
				terms: ["#subtitle", "字幕"]
			},
			{
				key: "视频下载",
				words: [
					"视频下载",
					"youtube",
					"油管",
					"b站",
					"bilibili",
					"哔哩"
				],
				terms: [
					"youtube",
					"bilibili",
					"yt-dlp",
					"b站"
				]
			},
			{
				key: "微博",
				words: ["微博"],
				terms: ["weibo", "微博"]
			},
			{
				key: "微信",
				words: [
					"微信",
					"公众号",
					"wechat"
				],
				terms: [
					"wechat",
					"weixin",
					"微信",
					"公众号"
				]
			},
			{
				key: "Twitter",
				words: [
					"twitter",
					"tweet",
					"推文"
				],
				terms: ["twitter", "tweet"]
			},
			{
				key: "Telegram",
				words: ["telegram"],
				terms: ["telegram"]
			},
			{
				key: "Discord",
				words: ["discord"],
				terms: ["discord"]
			},
			{
				key: "飞书钉钉",
				words: [
					"飞书",
					"钉钉",
					"lark"
				],
				terms: [
					"#feishu",
					"#lark",
					"#dingtalk",
					"飞书",
					"钉钉"
				]
			},
			{
				key: "Notion",
				words: ["notion"],
				terms: ["notion"]
			},
			{
				key: "Obsidian",
				words: ["obsidian"],
				terms: ["obsidian"]
			},
			{
				key: "MCP",
				words: ["mcp", "mcp服务器"],
				terms: [
					"#mcp",
					"mcp-server",
					"MCP管理",
					"MCP调试"
				]
			},
			{
				key: "备份恢复",
				words: ["备份", "恢复"],
				terms: [
					"#backup",
					"#restore",
					"备份",
					"恢复"
				]
			},
			{
				key: "同步",
				words: ["同步"],
				terms: ["#sync", "同步"]
			},
			{
				key: "主题美化",
				words: [
					"主题",
					"美化",
					"皮肤"
				],
				terms: [
					"#theme",
					"#themes",
					"主题",
					"美化"
				]
			},
			{
				key: "字体",
				words: ["字体"],
				terms: [
					"#font",
					"#fonts",
					"字体"
				]
			},
			{
				key: "颜色配色",
				words: [
					"颜色",
					"配色",
					"色板"
				],
				terms: [
					"#color",
					"#palette",
					"颜色",
					"配色"
				]
			},
			{
				key: "图标",
				words: ["图标"],
				terms: [
					"#icon",
					"#icons",
					"图标"
				]
			},
			{
				key: "二维码",
				words: ["二维码", "扫码"],
				terms: [
					"#qrcode",
					"#qr",
					"二维码"
				]
			},
			{
				key: "短链",
				words: ["短链", "短网址"],
				terms: [
					"#shorten",
					"url-shortener",
					"短链"
				]
			},
			{
				key: "正则",
				words: ["正则"],
				terms: [
					"#regex",
					"#regexp",
					"正则"
				]
			},
			{
				key: "格式化",
				words: ["格式化", "美化代码"],
				terms: [
					"#format",
					"#formatter",
					"#prettier",
					"格式化"
				]
			},
			{
				key: "JSON",
				words: ["json"],
				terms: ["#json"]
			},
			{
				key: "CSV",
				words: ["csv"],
				terms: ["#csv", "#tsv"]
			},
			{
				key: "API调试",
				words: [
					"api",
					"接口",
					"mock"
				],
				terms: [
					"#api",
					"#mock",
					"#rest",
					"接口"
				]
			},
			{
				key: "测试",
				words: ["测试"],
				terms: [
					"#test",
					"#testing",
					"测试"
				]
			},
			{
				key: "Docker",
				words: ["docker", "容器"],
				terms: [
					"#docker",
					"#container",
					"容器"
				]
			},
			{
				key: "服务器运维",
				words: [
					"服务器",
					"运维",
					"部署"
				],
				terms: [
					"#deploy",
					"#ops",
					"#devops",
					"服务器",
					"部署",
					"运维"
				]
			},
			{
				key: "SSH远程",
				words: ["ssh", "远程"],
				terms: [
					"#ssh",
					"#remote",
					"远程"
				]
			},
			{
				key: "图床上传",
				words: ["图床", "上传"],
				terms: [
					"#upload",
					"image-hosting",
					"图床",
					"上传"
				]
			},
			{
				key: "磁力种子",
				words: [
					"磁力",
					"种子",
					"bt",
					"迅雷"
				],
				terms: [
					"#torrent",
					"#magnet",
					"#bt",
					"种子",
					"磁力"
				]
			},
			{
				key: "总结摘要",
				words: [
					"总结",
					"摘要",
					"概要"
				],
				terms: [
					"#summary",
					"#summarize",
					"总结",
					"摘要"
				]
			},
			{
				key: "写作文案",
				words: [
					"写作",
					"文案",
					"改写"
				],
				terms: [
					"#write",
					"#writing",
					"写作",
					"文案",
					"内容创作"
				]
			},
			{
				key: "代码审查",
				words: [
					"审查",
					"评审",
					"review"
				],
				terms: [
					"#review",
					"code-review",
					"审查"
				]
			},
			{
				key: "面试",
				words: ["面试"],
				terms: ["#interview", "面试"]
			},
			{
				key: "简历",
				words: ["简历"],
				terms: [
					"#resume",
					"#cv",
					"简历"
				]
			},
			{
				key: "健康健身",
				words: [
					"健康",
					"健身",
					"体重"
				],
				terms: [
					"#health",
					"#fitness",
					"健康",
					"健身"
				]
			},
			{
				key: "记账",
				words: [
					"记账",
					"账单",
					"花销"
				],
				terms: [
					"#expense",
					"#billing",
					"记账",
					"账单"
				]
			},
			{
				key: "农历节日",
				words: [
					"农历",
					"节日",
					"假期"
				],
				terms: [
					"#lunar",
					"#holiday",
					"农历",
					"节日"
				]
			},
			{
				key: "随机抽签",
				words: [
					"随机",
					"抽签",
					"骰子"
				],
				terms: [
					"#random",
					"#dice",
					"随机"
				]
			},
			{
				key: "桌宠",
				words: ["桌宠", "桌面宠物"],
				terms: ["#desktop-pet", "桌宠"]
			},
			{
				key: "数据分析",
				words: ["数据分析", "数据统计"],
				terms: [
					"#data-analysis",
					"#analytics",
					"数据分析",
					"数据统计"
				]
			},
			{
				key: "多模态",
				words: ["多模态"],
				terms: [
					"#multimodal",
					"#multi-modal",
					"多模态"
				]
			},
			{
				key: "提示词",
				words: ["提示词", "prompt"],
				terms: [
					"#prompt",
					"提示词管理",
					"提示词优化"
				]
			},
			{
				key: "报告生成",
				words: [
					"报告生成",
					"周报",
					"日报"
				],
				terms: [
					"#report",
					"报告生成",
					"周报",
					"日报"
				]
			}
		];
		/** 词边界匹配标记前缀（见文件头设计约定） */
		const TOKEN_MARK = "#";
		/** 该召回词是否为词边界（token）匹配 */
		function isTokenTerm(term) {
			return term.startsWith(TOKEN_MARK);
		}
		/** 去掉词边界标记后的实际匹配词 */
		function rawTerm(term) {
			return isTokenTerm(term) ? term.slice(1) : term;
		}
		const tokenRegexCache = /* @__PURE__ */ new Map();
		/**
		* 词边界（token）匹配：`term` 在文本中作为独立词出现才命中。
		* 边界 = 非小写字母数字（大小写不敏感，文本需先转小写）——
		* "ai-chat" 命中 "ai"、"AI聊天" 命中（CJK 是边界）、"email"/"main" 不命中。
		*/
		function tokenInText(term, text) {
			let re = tokenRegexCache.get(term);
			if (!re) {
				const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?![a-z0-9])`, "i");
				tokenRegexCache.set(term, re);
			}
			return re.test(text);
		}
		//#endregion
		//#region ../../schema/dist/zh-taxonomy.js
		/** 实用分归一读取（全量 score.total / lite scoreTotal 双形态） */
		function facetScoreOf(p) {
			return p.score?.total ?? p.scoreTotal ?? 0;
		}
		/** 对单个插件判断一组召回词的命中层级。hay 传 null 时跳过弱信号判定。 */
		function matchTerms(nameLower, fullNameLower, tagsLower, hay, terms) {
			let weak = false;
			for (const t of terms) {
				const raw = rawTerm(t);
				if (tagsLower.includes(raw)) return "strong";
				if (isTokenTerm(t)) {
					if (tokenInText(raw, nameLower) || tokenInText(raw, fullNameLower)) return "strong";
					if (hay !== null && !weak && tokenInText(raw, hay)) weak = true;
				} else {
					if (nameLower.includes(raw) || fullNameLower.includes(raw)) return "strong";
					if (hay !== null && !weak && hay.includes(raw)) weak = true;
				}
			}
			return weak ? "weak" : null;
		}
		/** 意图 key → 召回词（查不到返回 null；分类过滤 UI 用） */
		function intentTerms(key) {
			return ZH_INTENTS.find((it) => it.key === key)?.terms ?? null;
		}
		/**
		* 为全库构建中文分类 facets。只统计强信号（browse 场景，精度优先，
		* "宁缺毋滥"与词典设计约定一致）；少于 minCount 个插件的意图不展示。
		* 按覆盖数降序；一次性 O(意图数 × 插件数)，9k × ~100 在首页加载时约百毫秒级。
		*/
		function buildZhFacets(plugins, minCount = 3) {
			const lowered = /* @__PURE__ */ new Map();
			for (const p of plugins) lowered.set(p, {
				name: p.name.toLowerCase(),
				full: p.fullName.toLowerCase(),
				tags: p.tags.map((t) => t.toLowerCase())
			});
			const out = [];
			for (const it of ZH_INTENTS) {
				const strong = [];
				for (const p of plugins) {
					const l = lowered.get(p);
					if (matchTerms(l.name, l.full, l.tags, null, it.terms) === "strong") strong.push(p);
				}
				if (strong.length >= minCount) {
					strong.sort((a, b) => facetScoreOf(b) - facetScoreOf(a));
					out.push({
						key: it.key,
						count: strong.length,
						plugins: strong
					});
				}
			}
			return out.sort((a, b) => b.count - a.count);
		}
		//#endregion
		//#region src/client/panel.tsx
		/**
		* 插件市场面板（5-tab：推荐 / 搜索 / 收藏 / 已装 / 设置）
		* 数据全部来自 Host RPC（api.ts）。纯 React.createElement（无 JSX）。
		*/
		/** GitHub 设备流 client_id（dsh-market GitHub App，公开值非机密） */
		const GH_CLIENT_ID = "Iv23liYFieChYuBJklZp";
		const GH_TOKEN_KEY = "dsh-market:gh_token";
		/** 断线重连：进行中安装的 installId 留存（宿主侧安装不随面板关闭终止；
		*  面板重新打开时按它轮询 ai:install:status 恢复进度与终态） */
		const PENDING_INSTALL_KEY = "dsh-market:pending-install";
		// UI feedback patch: explicit AI provenance, host installation stages and transactional failures.
		function semanticFeedback(ai) {
			const model = [ai?.provider, ai?.model].filter(Boolean).join(" / ") || "宿主未提供模型";
			const reason = ai?.reason ? `；原因：${ai.reason}` : "";
			if (ai?.status === "used") return `AI 语义搜索已使用：${model}${reason}`;
			if (ai?.status === "fallback") return `AI 搜索已退回一般搜索（模型：${model}）${reason}`;
			if (ai?.status === "unavailable") return `AI 不可用，已退回一般搜索（模型：${model}）${reason}`;
			return "宿主未提供 AI 使用状态，无法确认是否使用模型。";
		}
		function warningText(result) {
			const warnings = result?.warnings;
			return (Array.isArray(warnings) ? warnings : warnings ? [warnings] : []).map((w) => typeof w === "string" ? w : w?.message || JSON.stringify(w)).filter(Boolean).join("；");
		}
		function applicationText(result) {
			const application = result?.application?.status ?? result?.application;
			return application === "applied" ? "已生效" : application === "restart-required" ? "需要重启 Harness 后生效" : "请在「已装」列表确认生效状态";
		}
		function operationFailure(action, result) {
			const rollback = result?.rollback;
			let recovery = "";
			if (rollback) {
				if (rollback.attempted === false) recovery = "；未执行回復，请检查原状态";
				else if (rollback.ok === true) recovery = `；回復成功（本次操作仍然失败）${rollback.application ? `；${applicationText(rollback)}` : ""}`;
				else if (rollback.ok === false) recovery = `；回復失败：${rollback.error || "原因未知"}，请检查宿主配置与插件状态`;
				else recovery = "；回復状态未确认，请检查宿主配置与插件状态";
			}
			const warnings = warningText(result);
			return `${action}失败：${result?.error || result?.message || "宿主未返回成功结果"}${recovery}${warnings ? `；警告：${warnings}` : ""}`;
		}
		function installStageText(status) {
			const stages = {
				"inspecting": "正在检查安装信息",
				"installing": "等待宿主插件管理器完成安装",
				"needs-approval": "需要确认构建脚本，请前往内建插件管理器",
				"failed": "安装失败",
				"applied": "安装已生效",
				"restart-required": "安装完成，需要重启 Harness",
				"cancelled": "安装已取消"
			};
			const stage = stages[status?.stage] || status?.stage || "等待宿主安装状态";
			return `${stage}${status?.message ? `：${status.message}` : ""}${status?.error ? `；${status.error}` : ""}`;
		}
		/** 只停止 UI 状态查询，不取消宿主安装；总等待上限包含无响应的请求。 */
		function watchInstallStatus(installId, onStatus, onError, onProgress, options = {}) {
			let alive = true;
			let polls = 0;
			let retryTimer;
			let lastError = "";
			const controller = new AbortController();
			const stop = () => {
				alive = false;
				clearTimeout(retryTimer);
				clearTimeout(deadlineTimer);
				controller.abort();
			};
			const finish = (status, error) => {
				if (!alive) return;
				stop();
				try {
					const pending = JSON.parse(localStorage.getItem(PENDING_INSTALL_KEY) || "null");
					if (!options.preservePending && pending?.installId === installId) localStorage.removeItem(PENDING_INSTALL_KEY);
				} catch (e) {
					error = `${error || "安装状态查询已结束"}；无法清除本地等待记录：${e.message}`;
				}
				if (error) onError(`${error}。无法确认安装结果；仅停止等待，未取消后台安装。请检查安装话题或「已装」列表，确认前不要重复安装。`);
				else onStatus(status);
			};
			const timeout = () => finish(null, `等待安装状态超时（最多 10 分钟 / 200 次查询）${lastError ? `；最后查询错误：${lastError}` : ""}`);
			const deadlineTimer = setTimeout(timeout, 600000);
			const tick = async () => {
				if (!alive) return;
				polls += 1;
				try {
					const s = await api("ai:install:status", { installId }, { signal: controller.signal });
					if (!alive) return;
					lastError = "";
					if (s?.known === false && options.allowUnknown) {
						if (polls >= 200) timeout();
						else retryTimer = setTimeout(tick, 3000);
						return;
					}
					if (!s || s.known === false) return finish(null, "宿主未找到此安装任务（可能已重启或记录已过期）");
					if (onProgress) onProgress(s);
					if (s.running === false) {
						if (s.cancelled === true || typeof s.ok === "boolean") return finish(s);
						return finish(null, "安装状态响应缺少明确结果");
					}
					if (s.running !== true) return finish(null, "安装状态响应无效");
				} catch (e) {
					if (!alive) return;
					lastError = e?.message || String(e);
				}
				if (polls >= 200) timeout();
				else retryTimer = setTimeout(tick, 3000);
			};
			void tick();
			return stop;
		}
		const GH_LOGIN_KEY = "dsh-market:gh_login";
		const GH_METHOD_KEY = "dsh-market:gh_method";
		const FAVORITES_KEY = "dsh-market:favorites";
		/** 收藏列表（localStorage） */
		function readFavorites() {
			try {
				const raw = localStorage.getItem(FAVORITES_KEY);
				return raw ? JSON.parse(raw) : [];
			} catch {
				return [];
			}
		}
		function writeFavorites(list) {
			localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
		}
		function isFavorite(id) {
			return readFavorites().includes(id);
		}
		function toggleFavorite(id) {
			const list = readFavorites();
			const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
			writeFavorites(next);
			return next.includes(id);
		}
		/** 当前 GitHub token（浏览器 localStorage；设备流或 PAT） */
		function ghToken() {
			return localStorage.getItem(GH_TOKEN_KEY);
		}
		/** 绑定方式：device（GitHub App，不能 star）/ pat */
		function ghMethod() {
			return localStorage.getItem(GH_METHOD_KEY) ?? null;
		}
		/** 跨 tab 搜索词（标签点击 → 搜索 tab） */
		let searchSeed = "";
		function setSearchSeed(t) {
			searchSeed = t;
		}
		/** 聚合热门中文标签（问卷/搜索快捷入口共用） */
		function aggregateHotTags(plugins, n = 14) {
			const counts = /* @__PURE__ */ new Map();
			for (const p of plugins) for (const t of p.tags) {
				if (!/[\u4e00-\u9fff]/.test(t)) continue;
				if ([
					"效率工具",
					"开发辅助",
					"AI 增强",
					"AI增强",
					"自动化"
				].includes(t)) continue;
				counts.set(t, (counts.get(t) ?? 0) + 1);
			}
			return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t);
		}
		let quizTriggered = false;
		function markQuizSubmitted() {
			quizTriggered = false;
		}
		function markQuizTriggered() {
			quizTriggered = true;
		}
		function fmtStars(n) {
			return n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
		}
		function El(tag, props, ...children) {
			return (0, react.createElement)(tag, props ?? {}, ...children);
		}
		/** P0-1 装后四态 → 中文短标签 */
		function activationText(a) {
			if (!a) return "";
			const label = {
				live: "已生效",
				pending: "等待宿主載入",
				restart: "重启后生效",
				inert: "未成为插件层",
				broken: "校验失败"
			}[a.state] ?? a.state;
			return a.reasons && a.reasons.length ? `${label}（${a.reasons[0]}）` : label;
		}
		/** P0-2 从安装/更新失败输出解析被拦构建包名 */
		function parseBlockedFromOutput(output, item) {
			const pkgs = (output.match(/Ignored build scripts\s*:\s*([^\n]*)/i)?.[1] ?? "").split(",").map((s) => s.trim().replace(/\.$/, "").replace(/@\d[\w.\-+]*$/, "")).filter(Boolean);
			if (pkgs.length === 0 && item.plugin) {
				const fallback = item.plugin.name.replace(/\.$/, "").trim();
				if (fallback) pkgs.push(fallback);
			}
			return [...new Set(pkgs)];
		}
		let toastTimer = null;
		function toast(msg, duration = 2200) {
			if (typeof document === "undefined") return;
			document.querySelectorAll("[data-dshm-toast]").forEach((n) => n.remove());
			if (toastTimer) clearTimeout(toastTimer);
			const el = document.createElement("div");
			el.setAttribute("data-dshm-toast", "");
			el.className = styles_module_css_default.toast;
			el.textContent = msg;
			document.body.appendChild(el);
			toastTimer = setTimeout(() => el.remove(), duration);
		}
		/** 通用线性图标：dangerouslySetInnerHTML 承载 path/circle 内容 */
		function Icon(props) {
			return El("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				width: props.size ?? 14,
				height: props.size ?? 14,
				className: props.className,
				dangerouslySetInnerHTML: { __html: props.d }
			});
		}
		/** 图标 path 集（与 design-ref/ui-redesign/direction-B-克制增强.html 一致） */
		const ICON_SCENE = "<path d=\"M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8\"/>";
		const ICON_HEART = "<path d=\"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z\"/>";
		const ICON_AWARD = "<path d=\"M6 3h12l3 6-9 12L3 9l3-6z\"/><path d=\"M3 9h18M9 21l3-3 3 3\"/>";
		const ICON_CLOCK = "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>";
		const ICON_LINK = "<path d=\"M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6v6\"/><path d=\"M10 14 20 4\"/>";
		const ICON_STAR = "<path d=\"M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z\"/>";
		const ICON_STAR_OUTLINE = "<path d=\"M12 3l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.3L6.7 19l1.4-6-4.6-4 6.1-.5z\"/>";
		const ICON_CLOSE = "<path d=\"M18 6 6 18M6 6l12 12\"/>";
		const ICON_CHECK = "<path d=\"M20 6 9 17l-5-5\"/>";
		const ICON_WARN = "<path d=\"M12 3l10 18H2z\"/><path d=\"M12 10v4M12 17h.01\"/>";
		const ICON_EXTERNAL = "<path d=\"M7 17 17 7M7 7h10v10\"/>";
		const ICON_HELP = "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 10a3 3 0 0 1 6 0c0 2-3 2.5-3 4\"/><path d=\"M12 17h.01\"/>";
		const ICON_MODE = "<path d=\"M12 3a9 9 0 1 0 9 9\"/><path d=\"M12 3a9 9 0 0 1 9 9\"/><path d=\"M12 12 21 3\"/>";
		const ICON_SEARCH = "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m21 21-4.3-4.3\"/>";
		const ICON_GITHUB = "<path d=\"M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-5.7 0-1.3-.5-2.4-1.3-3.2.1-.3.6-1.6-.1-3.3 0 0-1-.3-3.4 1.2a11.6 11.6 0 0 0-6.2 0C6.5 2.5 5.5 2.8 5.5 2.8 4.8 4.5 5.3 5.8 5.4 6.1 4.6 6.9 4.1 8 4.1 9.3c0 4.3 2.7 5.4 5.5 5.7-.6.6-.6 1.2-.5 2V21\"/><path d=\"M9 9v4M9 9H7.5M9 20h3\"/>";
		const ICON_PACKAGE = "<path d=\"M22 7.5 12 2 2 7.5v9L12 22l10-5.5v-9z\"/><path d=\"M2 7.5 12 13l10-5.5M12 22v-9\"/>";
		function PluginCard(props) {
			const { plugin, reasons, onInstall, onTagClick } = props;
			const tags = (plugin.tags ?? []).filter((t) => /[\u4e00-\u9fff]/.test(t)).slice(0, 4);
			const [fav, setFav] = (0, react.useState)(() => isFavorite(plugin.id));
			const [starring, setStarring] = (0, react.useState)(false);
			const [starErr, setStarErr] = (0, react.useState)("");
			const toggleFav = () => {
				const now = toggleFavorite(plugin.id);
				setFav(now);
				toast(now ? `已收藏「${plugin.name}」` : `已取消收藏「${plugin.name}」`);
			};
			const toggleStar = async () => {
				const token = ghToken();
				if (!token) {
					toast("未绑定 GitHub，请到「设置」绑定后可加星");
					return;
				}
				if (ghMethod() === "device") {
					setStarErr("设备流授权不支持加星，请在设置里改用 PAT（个人令牌）绑定");
					return;
				}
				setStarring(true);
				setStarErr("");
				try {
					const [owner, repo] = plugin.fullName.split("/");
					await api("gh:star", {
						token,
						owner,
						repo,
						action: "star"
					});
					setStarErr("");
					toast(`已加星「${plugin.name}」`);
				} catch (e) {
					setStarErr(e.message.includes("403") || e.message.includes("404") ? "当前授权方式不支持加星，请改用 PAT（个人令牌）绑定" : `加星失败：${e.message}`);
				} finally {
					setStarring(false);
				}
			};
			return El("div", {
				className: styles_module_css_default.card,
				"data-type": plugin.type
			}, El("div", { className: styles_module_css_default.cardHead }, El("span", {
				className: styles_module_css_default.cardName,
				title: plugin.fullName
			}, plugin.name), El("span", { className: styles_module_css_default.cardBadge }, plugin.type === "skill" ? "技能" : "插件"), plugin.dshCompat ? El("span", {
				className: styles_module_css_default.compatChip,
				"data-status": plugin.dshCompat.status,
				title: plugin.dshCompat.reason
			}, plugin.dshCompat.label) : null, El("span", { className: styles_module_css_default.cardStars }, El(Icon, {
				d: ICON_STAR,
				size: 13
			}), fmtStars(plugin.stars))), plugin.descriptionZh ? El("div", { className: styles_module_css_default.cardDesc }, plugin.descriptionZh) : null, El("div", { className: styles_module_css_default.cardTags }, ...tags.map((t) => El("span", {
				key: t,
				className: styles_module_css_default.tag,
				onClick: () => onTagClick(t)
			}, t)), reasons && reasons.length > 0 ? reasons.map((r, i) => El("span", {
				key: `r${i}`,
				className: r.startsWith("AI：") ? styles_module_css_default.reasonAi : styles_module_css_default.reason
			}, r)) : null), El("div", { className: styles_module_css_default.cardActions }, El("button", {
				className: styles_module_css_default.repoBtn,
				title: `打开 GitHub 仓库：${plugin.fullName}`,
				onClick: () => window.open(`https://github.com/${plugin.fullName}`, "_blank", "noopener noreferrer")
			}, El(Icon, {
				d: ICON_LINK,
				size: 13
			}), "仓库"), El("span", { className: styles_module_css_default.spacer }), El("button", {
				className: `${styles_module_css_default.favBtn} ${fav ? styles_module_css_default.favBtnOn : ""}`,
				title: fav ? "取消收藏" : "收藏（稍后安装）",
				onClick: toggleFav
			}, El(Icon, {
				d: fav ? ICON_STAR : ICON_STAR_OUTLINE,
				size: 12
			}), "收藏"), El("button", {
				className: `${styles_module_css_default.iconBtn} ${starring ? styles_module_css_default.iconBtnOn : ""}`,
				title: ghToken() ? "在 GitHub 加星这个仓库（PAT 绑定支持）" : "未绑定 GitHub，点击查看绑定方式",
				disabled: starring,
				onClick: () => void toggleStar()
			}, starring ? "…" : El(Icon, {
				d: ICON_STAR,
				size: 15
			})), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary} ${styles_module_css_default.btnSm}`,
				onClick: () => onInstall(plugin)
			}, "安装")), starErr ? El("div", { className: styles_module_css_default.cardActionHint }, starErr) : null);
		}
		// Task records are host-owned; the UI never infers execution from acceptance.
		const TASK_STATUS = { running: "執行中", succeeded: "已完成", failed: "失敗", cancelled: "已取消", interrupted: "已中斷", "needs-attention": "需要處理" };
		function taskTime(value) {
			const date = new Date(value);
			return value && Number.isFinite(date.getTime()) ? date.toLocaleString() : "未知時間";
		}
		function taskDiagnostic(task) {
			// Deliberately omit free text, commands, environment, URLs and error payloads.
			const safe = {};
			for (const key of ["id", "pluginId", "profile", "kind", "status", "stage", "createdAt", "updatedAt", "childSessionId"]) {
				if (typeof task[key] === "string" || typeof task[key] === "number") safe[key] = task[key];
			}
			safe.running = task.running === true;
			safe.hasError = Boolean(task.error);
			return JSON.stringify(safe, null, 2);
		}
		function watchTasks(onTasks, onError, options = {}) {
			const page = options.page || document;
			const request = options.request || api;
			let alive = true, busy = false, timer, deadline, controller, generation = 0;
			const schedule = () => { if (alive && !page.hidden) timer = setTimeout(tick, 3000); };
			async function tick() {
				if (!alive || busy || page.hidden) return;
				busy = true;
				const current = ++generation;
				controller = new AbortController();
				deadline = setTimeout(() => {
					if (!alive || current !== generation || page.hidden) return;
					generation++;
					controller.abort();
					onError("安裝任務查詢逾時（15 秒）；保留最後已知資料。");
					// Keep busy until the aborted transport settles; never overlap requests.
				}, 15000);
				try {
					const result = await request("tasks:list", {}, { signal: controller.signal });
					if (!alive || current !== generation || page.hidden) return;
					if (!Array.isArray(result?.tasks)) throw new Error("安裝任務回應格式無效");
					onTasks(result.tasks, Date.now());
				} catch (error) {
					if (alive && current === generation && !page.hidden) onError(error.message || String(error));
				} finally { clearTimeout(deadline); busy = false; schedule(); }
			}
			const visibility = () => {
				clearTimeout(timer);
				if (page.hidden) { generation++; clearTimeout(deadline); controller?.abort(); }
				else if (!busy) void tick();
			};
			page.addEventListener("visibilitychange", visibility);
			void tick();
			return () => { alive = false; generation++; clearTimeout(timer); clearTimeout(deadline); controller?.abort(); page.removeEventListener("visibilitychange", visibility); };
		}
		function cancellationFeedback(result) {
			if (result?.accepted === true) return "已送出取消請求；等待任務狀態確認，未宣稱安裝已撤回。";
			if (result?.accepted === false) return "任務已結束或無可取消工作；請查看安裝任務確認實際結果。";
			return "宿主未確認是否接受取消請求；請查看安裝任務，不能確認工作已停止。";
		}
		function TaskCard({ task }) {
			const [feedback, setFeedback] = (0, react.useState)("");
			const [cancelling, setCancelling] = (0, react.useState)(false);
			const controllerRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => controllerRef.current?.abort(), []);
			const copy = async (text) => setFeedback(await copyText(text) ? "已複製" : "複製失敗，請手動選取文字");
			const cancel = async () => {
				if (controllerRef.current) return;
				const controller = new AbortController();
				controllerRef.current = controller;
				setCancelling(true);
				try {
					const result = await api("ai:install:cancel", { installId: task.id }, { signal: controller.signal });
					if (!controller.signal.aborted) setFeedback(cancellationFeedback(result));
				} catch (error) { if (!controller.signal.aborted) setFeedback(`取消失敗：${error.message}`); }
				finally { if (!controller.signal.aborted) { controllerRef.current = null; setCancelling(false); } }
			};
			return El("article", { className: styles_module_css_default.settingCard, style: { overflowWrap: "anywhere" } },
				El("h3", null, task.pluginName || task.pluginId || task.id),
				El("p", null, `${TASK_STATUS[task.status] || task.status || "未知狀態"} · ${task.kind || "未知類型"} · profile: ${task.profile || "未知"}`),
				El("p", null, `階段：${task.stage || "未知"} · ${task.message || "等待實際結果"}`),
				El("p", null, `建立：${taskTime(task.createdAt)}；更新：${taskTime(task.updatedAt)}`),
				El("p", null, `任務 ID：${task.id}`),
				task.error ? El("p", { role: "alert" }, typeof task.error === "string" ? task.error : "任務回報錯誤，請檢查子會話") : null,
				task.application ? El("p", null, `生效結果：${applicationText(task)}`) : null,
				task.status === "interrupted" ? El("p", null, "宿主中斷；結果未確認，不會自動重試。請先確認實際安裝狀態。") : null,
				task.childSessionId ? El("div", null, El("p", null, `已建立子會話：${task.childSessionId}`), El("button", { className: styles_module_css_default.btn, onClick: () => void copy(task.childSessionId) }, "複製完整子會話 ID")) : El("p", null, "尚無已確認的子會話"),
				El("details", null, El("summary", null, "進度時間線"), El("ol", null, ...(task.events || []).map((event, index) => El("li", { key: index }, `${taskTime(event.at)} · ${event.stage || ""} · ${event.message || ""}`)))),
				El("button", { className: styles_module_css_default.btn, onClick: () => void copy(taskDiagnostic(task)) }, "複製安全診斷"),
				task.running === true ? El("button", { className: styles_module_css_default.btn, disabled: cancelling, onClick: () => void cancel() }, cancelling ? "取消請求中…" : "取消任務") : null,
				El("p", { role: "status" }, feedback));
		}
		function TasksTab() {
			const [tasks, setTasks] = (0, react.useState)([]);
			const [error, setError] = (0, react.useState)("");
			const [updatedAt, setUpdatedAt] = (0, react.useState)(null);
			(0, react.useEffect)(() => watchTasks((records, at) => { setTasks(records); setUpdatedAt(at); setError(""); }, setError), []);
			return El("section", { "aria-label": "安裝任務" },
				El("h2", null, "安裝任務"),
				El("p", { role: "status" }, `最後更新：${updatedAt ? taskTime(updatedAt) : "尚未取得"}；僅此分頁可見時每 3 秒查詢。`),
				El("p", null, "狀態由宿主記錄提供；不自動重試、不批准安裝腳本。安全診斷不含訊息原文、命令或環境。"),
				error ? El("p", { role: "alert" }, `查詢失敗：${error}；保留最後已知資料。`) : null,
				!tasks.length ? El("p", null, updatedAt ? "尚無安裝任務" : "等待任務資料…") : null,
				...tasks.map((task) => El(TaskCard, { key: task.id, task })));
		}
		function sourceObservationText(label, value) {
			if (!value) return `${label}：尚未查詢`;
			const stamp = value.checkedAt ? new Date(value.checkedAt).toLocaleString() : "時間未知";
			if (value.status !== "ok" || value.stale) return `${label}：${value.status === "rate-limited" ? "來源限流" : value.status === "unsupported" ? "無明確來源" : "未取得最新版本"}（${value.reason || value.status}）${value.version ? `；上次成功版本 ${value.version}，不可當作最新` : ""} · ${stamp}`;
			return `${label}：${value.version} · ${value.cached ? "5 分鐘內快取" : "來源查詢"} · ${stamp}`;
		}
		function sourceUpdateText(result) {
			if (!result) return "";
			const at = result.checkedAt ? ` · 查詢 ${new Date(result.checkedAt).toLocaleString()}` : "";
			if (result.kind === "none" || result.error || result.status !== "ok" || result.stale) return `無法確認最新版本：${result.error || result.reason || "來源查詢未成功"}${at}`;
			if (result.hasUpdate === true) return `npm 可更新 ${result.current} → ${result.latest}${at}`;
			if (result.hasUpdate !== false) return `版本無法比較${at}`;
			return `${result.comparison > 0 ? "目前版本高於 npm latest" : "已符合此安裝來源的 npm latest"} ${result.latest}${at}`;
		}
		function SourceVersionInfo({ pluginId }) {
			const [value, setValue] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const generation = (0, react.useRef)(0);
			const pending = (0, react.useRef)(null);
			const load = async (force) => {
				const seq = ++generation.current; pending.current?.abort();
				const ac = new AbortController(); pending.current = ac;
				const timeout = setTimeout(() => ac.abort(), 20000);
				setBusy(true); setError("");
				try { const next = await api("version:check", { pluginId, force }, { signal: ac.signal }); if (seq === generation.current) setValue(next); }
				catch (e) { if (seq === generation.current) setError(ac.signal.aborted ? "查詢逾時，無法確認最新版本" : e.message); }
				finally { clearTimeout(timeout); if (seq === generation.current) setBusy(false); }
			};
			(0, react.useEffect)(() => { setValue(null); void load(false); return () => { generation.current++; pending.current?.abort(); }; }, [pluginId]);
			return El("section", { className: styles_module_css_default.ghTip, "aria-label": "來源版本" },
				El("strong", null, "來源版本（非市場索引快照）"),
				El("p", null, "npm latest 與 GitHub release 是不同發布渠道，不互相替代。"),
				...[["npm", value?.npm], ["GitHub release", value?.github]].map(([label, data]) => El("div", { key: label }, sourceObservationText(label, data), data?.sourceURL ? El("a", { href: data.sourceURL, target: "_blank", rel: "noopener noreferrer" }, " 查看來源") : null)),
				error ? El("p", { role: "alert" }, error) : null,
				El("button", { type: "button", className: styles_module_css_default.btn, disabled: busy, onClick: () => void load(true) }, busy ? "查詢來源中…" : "重新查詢 npm／GitHub（略過快取）"));
		}
		function IndexFreshness({ onRefreshed }) {
			const [value, setValue] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const generation = (0, react.useRef)(0);
			const pending = (0, react.useRef)(null);
			const load = async (refresh) => {
				const seq = ++generation.current; pending.current?.abort(); const ac = new AbortController(); pending.current = ac;
				const timeout = setTimeout(() => ac.abort(), 45000); setBusy(true); setError("");
				try { const next = await api("data", { refresh }, { signal: ac.signal }); if (seq !== generation.current) return; setValue(next); if (refresh) onRefreshed(); }
				catch (e) { if (seq === generation.current) setError(ac.signal.aborted ? "索引查詢逾時；未確認更新" : e.message); }
				finally { clearTimeout(timeout); if (seq === generation.current) setBusy(false); }
			};
			(0, react.useEffect)(() => { void load(false); return () => { generation.current++; pending.current?.abort(); }; }, []);
			return El("section", { className: styles_module_css_default.ghTip, "aria-label": "索引新鮮度" },
				El("span", null, value ? `市場索引生成：${value.generatedAt ? new Date(value.generatedAt).toLocaleString() : "未知"} · ${value.stale ? "舊快照" : "索引快照"}` : "市場索引時間：尚未取得"),
				El("span", null, "；收錄資訊不是即時版本。開啟安裝視窗可直接查 npm／GitHub。"),
				El("button", { className: styles_module_css_default.btn, disabled: busy, onClick: () => void load(true) }, busy ? "讀取索引中…" : "重新取得市場索引"),
				error ? El("p", { role: "alert" }, error) : null);
		}
		function InstallModal(props) {
			const { plugin, onDone, onClose, onViewTasks } = props;
			const [parents, setParents] = (0, react.useState)([]);
			const [parentSessionId, setParentSessionId] = (0, react.useState)("");
			const [parentError, setParentError] = (0, react.useState)("");
			const modalController = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				modalController.current = controller;
				api("tasks:parents", {}, { signal: controller.signal }).then((result) => {
					if (!controller.signal.aborted) {
						if (!Array.isArray(result?.parents)) throw new Error("父會話回應格式無效");
						setParents(result.parents);
					}
				}).catch((error) => { if (!controller.signal.aborted) setParentError(error.message); });
				return () => controller.abort();
			}, []);
			const [phase, setPhase] = (0, react.useState)("confirm");
			const lastInstallIdRef = (0, react.useRef)("");
			const [t1Result, setT1Result] = (0, react.useState)(null);
			const t1WatchStopRef = (0, react.useRef)(null);
			const [review, setReview] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)("");
			const [errorClass, setErrorClass] = (0, react.useState)(null);
			const [diagCopied, setDiagCopied] = (0, react.useState)(false);
			const [childSessionId, setChildSessionId] = (0, react.useState)(null);
			const [security, setSecurity] = (0, react.useState)(false);
			const [forceCompat, setForceCompat] = (0, react.useState)(false);
			const compat = plugin.dshCompat;
			const compatBlocked = Boolean(compat?.block) && !forceCompat;
			const [t0, setT0] = (0, react.useState)(null);
			const [installProgress, setInstallProgress] = (0, react.useState)("");
			const initialWatchStopRef = (0, react.useRef)(null);
			/** #320：T1 转交后轮询 ai:install:status 到终态（宿主代执行完成后才有）。
			*  PENDING_INSTALL_KEY 保留到终态——面板中途关闭/刷新后重开可由恢复逻辑接手。 */
			const watchT1Terminal = (installId) => watchInstallStatus(installId, (s) => {
				setT1Result({
					...s,
					ok: s.ok === true && s.applied !== false && !s.cancelled,
					error: s.cancelled ? "安装已取消" : operationFailure("安装", s)
				});
				if (s.ok === true && s.applied !== false && !s.cancelled) onDone();
			}, (message) => {
				setError(message);
				setErrorClass(null);
				setPhase("error");
			}, (s) => setInstallProgress(installStageText(s)));
			(0, react.useEffect)(() => () => {
				t1WatchStopRef.current?.();
				initialWatchStopRef.current?.();
			}, []);
			const startAi = async () => {
				setPhase("running");
				setError("");
				setT0(null);
				setT1Result(null);
				setChildSessionId(null);
				setInstallProgress("等待宿主插件管理器…（显示真实阶段，不提供下载百分比）");
				const installId = `${plugin.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
				lastInstallIdRef.current = installId;
				localStorage.setItem(PENDING_INSTALL_KEY, JSON.stringify({
					installId,
					pluginId: plugin.id,
					pluginName: plugin.name,
					at: Date.now()
				}));
				let keepPending = false;
				// Observe only: the original RPC owns completion; timeout never cancels installation.
				initialWatchStopRef.current?.();
				initialWatchStopRef.current = watchInstallStatus(installId,
					(s) => setInstallProgress(installStageText(s)),
					setInstallProgress, (s) => setInstallProgress(installStageText(s)),
					{ allowUnknown: true, preservePending: true });
				try {
					const r = await api("ai:install", {
						pluginId: plugin.id,
						security,
						installId,
						parentSessionId: parentSessionId || undefined
					}, { signal: modalController.current?.signal });
					if (modalController.current?.signal.aborted) return;
					setChildSessionId(r.childSessionId);
					if (r.cancelled) {
						setError("安装已取消");
						setErrorClass(null);
						setPhase("error");
						return;
					}
					if (r.ok === false || (!r.started && (r.ok !== true || r.smokeFailed))) throw new RpcError(operationFailure("安装", r), r.classified);
					if (r.started && !r.childSessionId) throw new Error("宿主未返回安装会话，无法确认安装结果；请检查内建插件管理器后再重试。");
					if (!r.started && r.childSessionId) setT1Result({ ...r, ok: r.ok === true && r.applied !== false });
					else if (!r.started) setT0(r);
					setPhase("handedOff");
					if (r.started && r.childSessionId) {
						keepPending = true;
						t1WatchStopRef.current?.();
						t1WatchStopRef.current = watchT1Terminal(installId);
					}
				} catch (e) {
					if (modalController.current?.signal.aborted) return;
					setError(e.message);
					setErrorClass(e instanceof RpcError ? e.classified ?? null : null);
					setDiagCopied(false);
					setPhase("error");
				} finally {
					initialWatchStopRef.current?.();
					initialWatchStopRef.current = null;
					if (!keepPending) localStorage.removeItem(PENDING_INSTALL_KEY);
				}
			};
			/** #165 建议二（审查与安装分离）：安全模式流程 = 只读审查 → 报告 → 用户确认 → 宿主受控执行。
			*  审查子代理零执行零写入，没有沙箱悖论；建议命令宿主执行前还会再过一次白名单。 */
			const startReview = async () => {
				setPhase("reviewing");
				const installId = `${plugin.id}-r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
				lastInstallIdRef.current = installId;
				try {
					const r = await api("ai:review", {
						pluginId: plugin.id,
						installId,
						parentSessionId: parentSessionId || undefined
					}, { signal: modalController.current?.signal });
					if (modalController.current?.signal.aborted) return;
					if (!r.childSessionId || r.ok === false || (!r.started && r.status !== "succeeded")) throw new Error(r.error || r.message || "尚未確認審查子會話，請查看安裝任務");
					setChildSessionId(r.childSessionId);
					let polls = 0;
					for (;;) {
						const signal = modalController.current?.signal;
						if (signal?.aborted) return;
						await new Promise((resolve) => {
							const done = () => { clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); };
							const timer = setTimeout(done, 3000);
							signal?.addEventListener("abort", done, { once: true });
						});
						if (signal?.aborted) return;
						polls++;
						const p = await api("ai:review:poll", { installId }, { signal });
						if (signal?.aborted) return;
						if (p.cancelled) {
							setPhase("confirm");
							return;
						}
						if (p.done) {
							if (p.verdict) {
								setReview(p.verdict);
								setPhase("report");
							} else {
								setError("审查超时，请稍后重试或按 README 手动安装");
								setPhase("error");
							}
							return;
						}
						if (polls > 140) {
							setError("审查超时，请稍后重试或按 README 手动安装");
							setPhase("error");
							return;
						}
					}
				} catch (e) {
					if (modalController.current?.signal.aborted) return;
					setError(e.message);
					setErrorClass(e instanceof RpcError ? e.classified ?? null : null);
					setPhase("error");
				}
			};
			/** 报告确认后的受控执行：宿主对建议命令再做白名单校验，白名单外返回 manual */
			const confirmReviewed = async () => {
				if (!review || review.commands.length === 0) {
					setError("审查未给出可自动执行的安装命令，请按\"手动执行\"命令操作");
					setPhase("error");
					return;
				}
				setPhase("running");
				const installId = `${plugin.id}-x-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
				lastInstallIdRef.current = installId;
				try {
					const r = await api("ai:install:reviewed", {
						pluginId: plugin.id,
						commands: review.commands,
						installId,
						parentSessionId: parentSessionId || undefined
					}, { signal: modalController.current?.signal });
					if (modalController.current?.signal.aborted) return;
					if (r.cancelled) {
						setPhase("confirm");
						return;
					}
					if (r.blocked && r.blocked.length > 0) {
						setReview({
							...review,
							manual: r.blocked.map((b) => b.command)
						});
						setError("部分命令未通过直装白名单，请按\"手动执行\"命令操作");
						setPhase("error");
						return;
					}
					if (r.ok !== true || r.smokeFailed) throw new RpcError(operationFailure("安装", r), r.classified);
					setT0({
						mode: "parsed",
						ok: r.ok,
						smokeFailed: r.smokeFailed ?? false,
						error: r.error ?? null,
						classified: r.classified ?? null
					});
					setPhase("handedOff");
				} catch (e) {
					if (modalController.current?.signal.aborted) return;
					setError(e.message);
					setErrorClass(e instanceof RpcError ? e.classified ?? null : null);
					setPhase("error");
				}
			};
			/** #165 建议三（可取消）：终止进行中的安装（宿主杀 T0 子进程 / 终止 T1 子代理） */
			const cancelInstall = async () => {
				try {
					const result = await api("ai:install:cancel", { installId: lastInstallIdRef.current }, { signal: modalController.current?.signal });
					if (!modalController.current?.signal.aborted) setInstallProgress(cancellationFeedback(result));
				} catch (error) { if (!modalController.current?.signal.aborted) setInstallProgress(`取消失敗：${error.message}`); }
			};
			/** P6：错误阶段一键复制诊断（含分类 + 环境快照 + 堆栈） */
			const copyErrorDiag = async () => {
				if (await copyText(await buildDiagnostics(`安装弹窗（${plugin.name}）`, new Error(error)))) {
					setDiagCopied(true);
					setTimeout(() => setDiagCopied(false), 2e3);
				} else toast("复制失败：诊断文本过长，请重试一次", 3e3);
			};
			const cmd = plugin.installCommands && plugin.installCommands.length > 0 ? plugin.installCommands[0] : plugin.installMethod === "skills-add" ? `git clone https://github.com/${plugin.fullName}.git` : `dsh plugin --profile web add ${plugin.name}`;
			const t0Commands = plugin.installCommands && plugin.installCommands.length > 0 ? plugin.installCommands : [cmd];
			const handedOffDone = phase === "handedOff" && (!childSessionId || t1Result !== null);
			return El("div", {
				className: styles_module_css_default.modalBackdrop,
				onClick: onClose
			}, El("div", {
				className: styles_module_css_default.modal,
				onClick: (e) => e.stopPropagation()
			}, El("button", { className: styles_module_css_default.btn, onClick: onViewTasks }, "查看安裝任務"), phase === "confirm" ? El(SourceVersionInfo, {pluginId: plugin.id}) : null, phase === "confirm" ? El("div", null,
				El("label", null, "AI 審查／診斷父會話（明確選擇，不自動猜測）", El("select", { className: styles_module_css_default.select, value: parentSessionId, onChange: (event) => setParentSessionId(event.target.value) }, El("option", { value: "" }, "請選擇父會話；原生直裝可不選"), ...parents.map((parent) => El("option", { key: parent.id, value: parent.id }, parent.label || parent.id)))),
				parentError ? El("p", { role: "alert" }, `無法查詢父會話：${parentError}`) : null,
				!parents.length ? El("p", null, "無可用父會話；需要 AI 時將等待人工處理，不會任選會話。") : null) : null,
				El("div", { className: styles_module_css_default.steps }, El("div", { className: `${styles_module_css_default.step} ${styles_module_css_default.stepActive}` }, El("span", { className: styles_module_css_default.stepDot }, "1"), "确认", El("span", { className: phase === "confirm" ? styles_module_css_default.stepBar : `${styles_module_css_default.stepBar} ${styles_module_css_default.stepBarDone}` })), El("div", { className: phase === "confirm" ? styles_module_css_default.step : `${styles_module_css_default.step} ${handedOffDone ? styles_module_css_default.stepDone : styles_module_css_default.stepActive}` }, El("span", { className: styles_module_css_default.stepDot }, phase === "confirm" ? "2" : El(Icon, {
				d: ICON_CHECK,
				size: 11
			})), "运行中", El("span", { className: handedOffDone ? `${styles_module_css_default.stepBar} ${styles_module_css_default.stepBarDone}` : styles_module_css_default.stepBar })), El("div", { className: handedOffDone ? `${styles_module_css_default.step} ${styles_module_css_default.stepDone}` : styles_module_css_default.step }, El("span", { className: styles_module_css_default.stepDot }, handedOffDone ? El(Icon, {
				d: ICON_CHECK,
				size: 11
			}) : "3"), "完成")), phase === "confirm" ? El("div", null, El("div", { className: styles_module_css_default.modalTitle }, `确认安装「${plugin.name}」`), El("div", { className: styles_module_css_default.modalDesc }, `一般 Cordis 插件由宿主管理器安裝；AI 審查／診斷須明確選擇父會話，只有建立成功後才顯示委派。任務結果與錯誤均可在「安裝任務」追蹤。`), plugin.needsConfig ? El("p", { className: styles_module_css_default.warn }, El(Icon, {
				d: ICON_WARN,
				size: 13,
				className: styles_module_css_default.inlineIcon
			}), "此插件需要額外設定（API Key / Token）；請依結果在外掛設定中處理，未自動提交金鑰。") : null, compat ? El("p", { className: compat.status === "incompatible" ? styles_module_css_default.warn : styles_module_css_default.ghTip }, compat.status === "incompatible" ? El(Icon, {
				d: ICON_WARN,
				size: 13,
				className: styles_module_css_default.inlineIcon
			}) : null, compat.reason) : null, compat?.block ? El("label", {
				className: styles_module_css_default.securityRow,
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8,
					marginTop: 4,
					cursor: "pointer"
				}
			}, El("input", {
				type: "checkbox",
				checked: forceCompat,
				onChange: (e) => setForceCompat(e.target.checked)
			}), El("span", { style: { fontSize: 12.5 } }, "仍然安装（版本不匹配可能导致 harness 启动异常）")) : null, El("p", { className: styles_module_css_default.ghTip }, plugin.type === "skill" ? "目标：装到技能目录（~/.agents/skills），装完即可用。" : "目标：装进 web profile，装完需重启 harness 生效。"), El("div", {
				className: styles_module_css_default.advanced,
				style: { marginTop: 6 }
			}, El("p", {
				className: styles_module_css_default.advancedTip,
				style: { marginBottom: 4 }
			}, "直装将执行以下命令（白名单外的命令会被拦截并转 AI 复核，不会直接运行）："), El("code", { className: styles_module_css_default.advancedCmd }, t0Commands.join("\n")), plugin.risky ? El("p", {
				className: styles_module_css_default.warn,
				style: {
					fontSize: 11.5,
					marginTop: 4
				}
			}, "⚠ " + (plugin.riskyReasons?.join("；") || "安装命令含风险形态") + "——请先阅读脚本内容再确认。") : null), El("details", { className: styles_module_css_default.advanced }, El("summary", null, "高级：查看/复制手动命令"), El("code", { className: styles_module_css_default.advancedCmd }, cmd), El("p", { className: styles_module_css_default.advancedTip }, "提示：手动命令仅供参考，不一定正确，请以该项目 README 为准。")), El("label", {
				className: styles_module_css_default.securityRow,
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8,
					marginTop: 4,
					cursor: "pointer"
				}
			}, El("input", {
				type: "checkbox",
				checked: security,
				onChange: (e) => setSecurity(e.target.checked)
			}), El("span", { style: {
				fontSize: 13,
				fontWeight: 600
			} }, "🛡 安全模式"), El("span", {
				className: styles_module_css_default.securityDesc,
				style: {
					fontSize: 11.5,
					color: "#8a919f"
				}
			}, security ? "开启：AI 只读审查 → 看报告确认后才安装（危险命令/信息收集/配置篡改/网络暴露/来源）" : "关闭：快速安装（零 LLM 直装优先）")), security ? El("p", {
				className: styles_module_css_default.warn,
				style: { fontSize: 12 }
			}, El(Icon, {
				d: ICON_WARN,
				size: 13,
				className: styles_module_css_default.inlineIcon
			}), "安全模式会消耗 token（AI 扫描），且跳过零 LLM 直装；来源不明的插件建议开启。") : null, El("div", { className: styles_module_css_default.modalActions }, El("button", {
				className: styles_module_css_default.btn,
				onClick: onClose
			}, "取消"), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				disabled: compatBlocked || (security && !parentSessionId),
				title: compatBlocked ? "该插件要求更高的 DSH 版本，请先勾选上方\"仍然安装\"" : void 0,
				onClick: () => void (security ? startReview() : startAi())
			}, security ? "🛡 安全安装" : "确认安装"))) : phase === "reviewing" ? El("div", null, El("div", { className: styles_module_css_default.modalTitle }, "🛡 安全审查中"), El("div", { className: styles_module_css_default.loading }, childSessionId ? `已建立只讀審查子會話 ${childSessionId}；等待實際結果。${installProgress}` : "等待宿主確認審查請求；尚未確認子會話。"), El("div", { className: styles_module_css_default.modalActions }, El("button", {
				className: styles_module_css_default.btn,
				onClick: () => void cancelInstall()
			}, "取消审查"))) : phase === "report" ? El("div", null, El("div", { className: styles_module_css_default.modalTitle }, "🛡 安全审查报告"), review?.reason ? El("div", { className: styles_module_css_default.modalDesc }, review.reason) : null, ...(review?.risks ?? []).map((rk, i) => El("p", {
				key: i,
				className: styles_module_css_default.warn,
				style: { fontSize: 12 }
			}, El(Icon, {
				d: ICON_WARN,
				size: 13,
				className: styles_module_css_default.inlineIcon
			}), `[${(rk.level ?? "info").toUpperCase()}] ${rk.point}`)), review && review.commands.length > 0 ? El("div", {
				className: styles_module_css_default.advanced,
				style: { marginTop: 6 }
			}, El("p", {
				className: styles_module_css_default.advancedTip,
				style: { marginBottom: 4 }
			}, "确认后将执行以下命令（白名单内，宿主安装前会再次校验）："), El("code", { className: styles_module_css_default.advancedCmd }, review.commands.join("\n"))) : null, review && review.manual.length > 0 ? El("div", {
				className: styles_module_css_default.advanced,
				style: { marginTop: 6 }
			}, El("p", {
				className: styles_module_css_default.advancedTip,
				style: { marginBottom: 4 }
			}, "以下命令不在白名单内，请手动执行："), El("code", { className: styles_module_css_default.advancedCmd }, review.manual.join("\n"))) : null, El("div", { className: styles_module_css_default.modalActions }, El("button", {
				className: styles_module_css_default.btn,
				onClick: onClose
			}, "取消"), review && review.commands.length > 0 ? El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				onClick: () => void confirmReviewed()
			}, "确认安装") : null)) : phase === "running" ? El("div", null, El("div", { className: styles_module_css_default.modalTitle }, "正在安装"), El("div", { className: styles_module_css_default.loading, role: "status", "aria-live": "polite" }, installProgress || "正在安装与验证…"), El("div", { className: styles_module_css_default.modalActions }, El("button", {
				className: styles_module_css_default.btn,
				onClick: () => void cancelInstall()
			}, "取消安装"))) : phase === "handedOff" ? childSessionId ? El("div", null, t1Result === null ? El("div", null, El("div", { className: styles_module_css_default.modalTitle }, "已转交 AI 助手处理"), El("div", { className: styles_module_css_default.modalDesc }, `已建立子會話 ${childSessionId}；等待實際結果。建立會話不代表診斷已開始或安裝已完成；請在安裝任務查看狀態。`), El("div", { className: styles_module_css_default.loading, role: "status" }, installProgress || "正在确认安装结果…")) : t1Result.ok ? El("div", { className: styles_module_css_default.modalSuccess }, El("div", { className: styles_module_css_default.modalSuccessIcon }, El(Icon, {
				d: ICON_CHECK,
				size: 22
			})), El("div", { className: styles_module_css_default.modalSuccessTitle }, "安装完成（AI 协助）"), El("div", { className: styles_module_css_default.modalDesc }, `「${plugin.name}」安装完成；${applicationText(t1Result)}。`), warningText(t1Result) ? El("p", { className: styles_module_css_default.warn }, `警告：${warningText(t1Result)}`) : null) : El("div", null, El("div", { className: styles_module_css_default.modalError }, El(Icon, {
				d: ICON_CLOSE,
				size: 14,
				className: styles_module_css_default.inlineIcon
			}), "AI 协助安装未完成"), El("div", {
				className: styles_module_css_default.modalDesc,
				style: {
					marginTop: 8,
					fontSize: 12.5
				}
			}, `${t1Result.error ?? "未知原因"}。可按插件 README 手动安装，完成后重开面板查看。`)), El("div", { className: styles_module_css_default.modalActions }, t1Result && !t1Result.ok ? El("button", {
				className: styles_module_css_default.btn,
				onClick: () => {
					setT1Result(null);
					setPhase("confirm");
				}
			}, "重试") : null, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				onClick: () => {
					onDone();
					onClose();
				}
			}, "知道了"))) : El("div", { className: styles_module_css_default.modalSuccess }, El("div", { className: styles_module_css_default.modalSuccessIcon }, El(Icon, {
				d: ICON_CHECK,
				size: 22
			})), El("div", { className: styles_module_css_default.modalSuccessTitle }, t0?.mode === "native" ? "已由宿主插件管理器安装" : "安装完成（零 Token 直装）"), El("p", { className: styles_module_css_default.modalDesc }, t0?.mode === "native" ? `宿主插件管理器已完成安装；${applicationText(t0)}。` : t0?.alreadyInstalled ? `「${plugin.name}」已在目标位置检测到安装，已跳过。` : t0?.ok && !t0.smokeFailed ? `已通过${t0.mode === "recipe" ? "配方" : "解析命令"}直装完成，冒烟验证通过，无需 AI 介入。` : `直装完成。`), warningText(t0) ? El("p", { className: styles_module_css_default.warn, role: "status" }, `警告：${warningText(t0)}`) : null, El("div", { className: styles_module_css_default.modalActions }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				onClick: () => {
					onDone();
					onClose();
				}
			}, "知道了"))) : El("div", null, El("div", { className: styles_module_css_default.modalError }, El(Icon, {
				d: ICON_CLOSE,
				size: 14,
				className: styles_module_css_default.inlineIcon
			}), errorClass ? `${errorClass.title}` : `安装或状态查询出错：${error}`), errorClass ? El("div", {
				className: styles_module_css_default.modalDesc,
				style: {
					marginTop: 8,
					fontSize: 12.5
				}
			}, `建议：${errorClass.hint}`, El("span", {
				className: styles_module_css_default.updateHint,
				style: {
					display: "block",
					marginTop: 6,
					wordBreak: "break-all"
				},
				title: error
			}, `原始报错：${error.slice(0, 120)}`)) : null, El("div", { className: styles_module_css_default.modalActions }, El("button", {
				className: styles_module_css_default.btn,
				onClick: () => setPhase("confirm")
			}, "重试"), El("button", {
				className: styles_module_css_default.btn,
				onClick: () => void copyErrorDiag()
			}, diagCopied ? "已复制诊断 ✓" : "复制诊断"), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				onClick: onClose
			}, "关闭")))));
		}
		function SceneRow(props) {
			const { plugin, onInstall } = props;
			const [fav, setFav] = (0, react.useState)(() => isFavorite(plugin.id));
			const toggleFav = () => {
				const now = toggleFavorite(plugin.id);
				setFav(now);
				toast(now ? `已收藏「${plugin.name}」` : `已取消收藏「${plugin.name}」`);
			};
			return El("div", { className: styles_module_css_default.sceneRow }, El("div", { className: styles_module_css_default.sceneInfo }, El("div", { className: styles_module_css_default.sceneName }, plugin.name), El("div", { className: styles_module_css_default.sceneDesc }, plugin.descriptionZh)), El("button", {
				className: `${styles_module_css_default.favBtn} ${fav ? styles_module_css_default.favBtnOn : ""}`,
				title: fav ? "取消收藏" : "收藏（稍后安装）",
				onClick: toggleFav
			}, El(Icon, {
				d: fav ? ICON_STAR : ICON_STAR_OUTLINE,
				size: 12
			}), "收藏"), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary} ${styles_module_css_default.btnSm}`,
				onClick: () => onInstall(plugin)
			}, "获取"));
		}
		function RecommendTab(props) {
			const { plugins, profile, recs, loading, installedIds, onInstall, onTagClick, onSwitchMode, onQuizSubmit, sceneState, onFetchScene } = props;
			const [quizOpen, setQuizOpen] = (0, react.useState)(true);
			const [picked, setPicked] = (0, react.useState)([]);
			if (loading && recs.length === 0) return El("div", { className: styles_module_css_default.stateHint }, "加载推荐中…");
			if (recs.length === 0 && !loading) return El("div", { className: styles_module_css_default.stateHint }, "暂无推荐，先去搜索或完成问卷吧");
			const isNovice = !profile || profile.modeOverride === "novice" || profile.modeOverride === "auto" && profile.confidence < .4;
			const groups = [
				{
					title: "猜你喜欢",
					icon: ICON_HEART,
					items: recs.filter((r) => r.origin === "guess")
				},
				{
					title: "精选",
					icon: ICON_AWARD,
					items: recs.filter((r) => r.origin === "curated")
				},
				{
					title: "最近更新",
					icon: ICON_CLOCK,
					items: recs.filter((r) => r.origin === "trending")
				}
			].filter((g) => g.items.length > 0);
			const quizTags = aggregateHotTags(plugins, 20);
			const togglePick = (t) => {
				setPicked((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 6 ? prev : [...prev, t]);
			};
			const submitQuiz = () => {
				if (picked.length === 0) return;
				onQuizSubmit(picked).then(() => {
					markQuizSubmitted();
					setQuizOpen(false);
					toast("已根据偏好重新生成推荐");
				});
			};
			const skipQuiz = () => {
				setQuizOpen(false);
				toast("已跳过，推荐将按默认偏好生成");
			};
			const quizSubmitted = !profile || profile.sources.quiz.length > 0;
			const showQuiz = isNovice && quizOpen && (quizSubmitted ? quizTriggered : true);
			return El("div", { className: styles_module_css_default.tabBody }, showQuiz ? El("div", { className: styles_module_css_default.quizCard }, El("div", { className: styles_module_css_default.quizHead }, El("span", { className: styles_module_css_default.quizHeadIcon }, El(Icon, {
				d: ICON_HELP,
				size: 16
			})), El("span", { className: styles_module_css_default.quizTitle }, "先了解你的偏好"), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnGhost} ${styles_module_css_default.btnSm}`,
				onClick: skipQuiz
			}, "跳过")), El("div", { className: styles_module_css_default.quizDesc }, "告诉我你想用插件做什么，给我更准的推荐（可多选，可跳过）。"), El("div", { className: styles_module_css_default.quizTags }, ...quizTags.map((t) => El("span", {
				key: t,
				className: `${styles_module_css_default.quizChip} ${picked.includes(t) ? styles_module_css_default.quizChipOn : ""}`,
				onClick: () => togglePick(t)
			}, t))), El("div", { className: styles_module_css_default.quizActions }, El("span", { className: styles_module_css_default.quizCount }, `已选 ${picked.length} / 6`), El("div", { className: styles_module_css_default.quizCta }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				disabled: picked.length === 0,
				onClick: submitQuiz
			}, "为我推荐")))) : null, El("div", { className: styles_module_css_default.recommendToolbar }, El("span", { className: styles_module_css_default.recommendToolbarIcon }, El(Icon, {
				d: ICON_MODE,
				size: 14
			})), El("span", { className: styles_module_css_default.recommendHint }, isNovice ? [
				"当前为",
				El("b", { key: "b1" }, "新手模式"),
				"，推荐更稳妥通用。可切换到",
				El("b", { key: "b2" }, "个性化模式"),
				"获取贴合你工作流的建议。"
			] : [
				"当前为",
				El("b", { key: "b1" }, "个性化模式"),
				"，推荐将贴合你的工作流与偏好持续调整。"
			])), El("div", { className: styles_module_css_default.modeSwitchRow }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				onClick: () => void onSwitchMode()
			}, isNovice ? "切换到 · 个性化模式" : "切换到 · 新手模式")), El("div", { className: styles_module_css_default.section }, El("div", { className: styles_module_css_default.sectionHead }, El(Icon, {
				d: ICON_SCENE,
				size: 14,
				className: styles_module_css_default.sectionIcon
			}), El("h3", { className: styles_module_css_default.sectionTitle }, "适合当前场景"), El("span", { className: styles_module_css_default.sectionNote }, sceneState.loading ? "读取会话上下文…" : sceneState.recs.length > 0 ? `基于「${sceneState.sceneTags.slice(0, 3).join(" / ")}」` : "基于你的工作区"), sceneState.loading ? null : El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				onClick: () => void onFetchScene()
			}, sceneState.recs.length > 0 ? "刷新" : "获取场景推荐")), sceneState.loading ? El("div", { className: styles_module_css_default.stateHint }, "读取中…") : sceneState.recs.length > 0 ? El("div", { className: styles_module_css_default.sceneList }, ...sceneState.recs.slice(0, 4).map((r) => El(SceneRow, {
				key: r.plugin.id,
				plugin: r.plugin,
				onInstall
			}))) : El("p", { className: styles_module_css_default.sceneEmpty }, "根据你当前正在做的事推荐插件（点击获取，基于会话内容）")), ...groups.map((g) => El("div", {
				key: g.title,
				className: styles_module_css_default.section
			}, El("div", { className: styles_module_css_default.sectionHead }, El(Icon, {
				d: g.icon,
				size: 14,
				className: styles_module_css_default.sectionIcon
			}), El("h3", { className: styles_module_css_default.sectionTitle }, g.title), g.title === "精选" ? El("span", { className: styles_module_css_default.sectionNote }, "编辑推荐") : null), El("div", { className: styles_module_css_default.grid2 }, ...g.items.map((r) => El(PluginCard, {
				key: r.plugin.id,
				plugin: r.plugin,
				reasons: r.reasons,
				origin: r.origin,
				onInstall,
				onTagClick
			}))))), installedIds.size > 0 ? El("div", { className: styles_module_css_default.installedNote }, `已排除 ${installedIds.size} 个已安装插件`) : null);
		}
		function SearchTab(props) {
			const { plugins, onInstall, onTagClick } = props;
			const [query, setQuery] = (0, react.useState)("");
			const [tags, setTags] = (0, react.useState)([]);
			const [type, setType] = (0, react.useState)("all");
			const [results, setResults] = (0, react.useState)([]);
			const [searching, setSearching] = (0, react.useState)(false);
			const [semanticOn, setSemanticOn] = (0, react.useState)(false);
			const [semanticNotice, setSemanticNotice] = (0, react.useState)("");
			const [semanticTags, setSemanticTags] = (0, react.useState)([]);
			const [hotExpanded, setHotExpanded] = (0, react.useState)(false);
			const [visible, setVisible] = (0, react.useState)(50);
			const [zhCat, setZhCat] = (0, react.useState)("");
			const debounceRef = (0, react.useRef)(null);
			const searchRequestRef = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				if (searchSeed) {
					setQuery(searchSeed);
					setSearchSeed("");
				}
			}, []);
			const hotAll = (0, react.useMemo)(() => aggregateHotTags(plugins, 40), [plugins]);
			const hot = hotExpanded ? hotAll : hotAll.slice(0, 8);
			const zhFacets = (0, react.useMemo)(() => buildZhFacets(plugins, 3), [plugins]);
			const zhVisible = (0, react.useMemo)(() => {
				const top = zhFacets.slice(0, 12);
				if (zhCat && !top.some((f) => f.key === zhCat)) {
					const sel = zhFacets.find((f) => f.key === zhCat);
					if (sel) return [sel, ...top.slice(0, 11)];
				}
				return top;
			}, [zhFacets, zhCat]);
			(0, react.useEffect)(() => {
				searchRequestRef.current += 1;
				setSemanticNotice("");
				setSemanticTags([]);
				if (debounceRef.current) clearTimeout(debounceRef.current);
				debounceRef.current = setTimeout(() => {
					runSearch();
				}, semanticOn && query.trim().length >= 2 ? 700 : 300);
				return () => {
					searchRequestRef.current += 1;
					if (debounceRef.current) clearTimeout(debounceRef.current);
				};
			}, [
				query,
				tags,
				type,
				semanticOn,
				zhCat
			]);
			const runSearch = async () => {
				const requestId = ++searchRequestRef.current;
				const current = () => requestId === searchRequestRef.current;
				setSemanticNotice("");
				setSemanticTags([]);
				setSearching(true);
				setVisible(50);
				try {
					if (!query.trim() && zhCat) {
						const members = (zhFacets.find((f) => f.key === zhCat)?.plugins ?? []).filter((p) => type === "all" || p.type === type).filter((p) => tags.every((t) => (p.tags ?? []).includes(t)));
						setSemanticTags([]);
						setResults(members.map((p) => ({
							plugin: p,
							relevance: 100,
							tagHits: 0
						})));
						return;
					}
					let out = null;
					if (semanticOn && query.trim().length >= 2) {
						try {
							const r = await api("search:semantic", { query });
							if (!current()) return;
							setSemanticNotice(semanticFeedback(r.ai));
							setSemanticTags(r.ai?.status === "used" ? r.tags ?? [] : []);
							if (Array.isArray(r.results)) out = r.results;
							else throw new Error("宿主未返回有效搜索结果");
						} catch (e) {
							if (!current()) return;
							setSemanticNotice(`AI 搜索失败：${e.message}；正在退回一般搜索。`);
						}
					}
					if (!out) {
						setSemanticTags([]);
						const opts = { limit: 0 };
						if (tags.length) opts.tags = tags;
						if (type !== "all") opts.type = type;
						out = await api("search", {
							query,
							options: opts
						});
					}
					if (!current()) return;
					if (out) out = out.filter((r) => (type === "all" || r.plugin.type === type) && tags.every((t) => (r.plugin.tags ?? []).includes(t)));
					if (zhCat && out) {
						const terms = intentTerms(zhCat) ?? [];
						out = out.filter((r) => matchTerms(r.plugin.name.toLowerCase(), r.plugin.fullName.toLowerCase(), (r.plugin.tags ?? []).map((t) => t.toLowerCase()), null, terms) === "strong");
					}
					setResults(out ?? []);
				} catch (e) {
					if (!current()) return;
					setResults([]);
					setSemanticNotice((previous) => `${previous ? previous + "；" : ""}搜索失败：${e.message}`);
				} finally {
					if (current()) setSearching(false);
				}
			};
			const toggleTag = (t) => {
				setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
			};
			return El("div", { className: styles_module_css_default.tabBody }, El("div", { className: styles_module_css_default.searchWrap }, El("span", { className: styles_module_css_default.searchWrapIcon }, El(Icon, {
				d: ICON_SEARCH,
				size: 15
			})), El("input", {
				className: styles_module_css_default.searchInput,
				placeholder: "搜索插件名称、标签或描述…",
				value: query,
				onChange: (e) => setQuery(e.target.value)
			}), query.length > 0 ? El("button", {
				className: styles_module_css_default.searchClear,
				"aria-label": "清除",
				onClick: () => setQuery("")
			}, El(Icon, {
				d: ICON_CLOSE,
				size: 13
			})) : null), El("div", { className: styles_module_css_default.filterRow }, ...[
				["all", "全部"],
				["cordis-plugin", "cordis 插件"],
				["skill", "skill"]
			].map(([v, label]) => El("span", {
				key: v,
				className: `${styles_module_css_default.filterChip} ${type === v ? styles_module_css_default.filterChipOn : ""}`,
				onClick: () => setType(v)
			}, label))), zhVisible.length > 0 ? El("div", { className: styles_module_css_default.filterRow }, El("span", { className: styles_module_css_default.zhCatLabel }, "中文分类："), ...zhVisible.map((f) => El("span", {
				key: f.key,
				className: `${styles_module_css_default.zhChip} ${zhCat === f.key ? styles_module_css_default.zhChipOn : ""}`,
				title: `按「${f.key}」浏览 · ${f.count} 个插件（词典强信号匹配）`,
				onClick: () => setZhCat((v) => v === f.key ? "" : f.key)
			}, f.key, El("em", { className: styles_module_css_default.zhChipCount }, String(f.count))))) : null, El("div", { className: styles_module_css_default.semanticToggle }, El("div", { className: styles_module_css_default.semanticInfo }, El("div", { className: styles_module_css_default.semanticTitle }, "AI 语义搜索", El("span", { className: styles_module_css_default.semanticPill }, "实验")), El("div", { className: styles_module_css_default.semanticDesc }, "理解自然语言需求并精排（消耗少量 token）。普通搜索已内置中文口语匹配，无需开启。")), El("div", {
				className: `${styles_module_css_default.semanticSwitch} ${semanticOn ? styles_module_css_default.semanticSwitchOn : ""}`,
				role: "switch",
				"aria-checked": semanticOn,
				title: semanticOn ? "关闭 AI 语义搜索" : "开启 AI 语义搜索",
				onClick: () => setSemanticOn((v) => !v)
			})), El("div", { className: styles_module_css_default.hotTagsTitle }, "热门标签"), El("div", { className: styles_module_css_default.tagCloud }, ...hot.map((t) => El("span", {
				key: t,
				className: `${styles_module_css_default.hotTag} ${tags.includes(t) ? styles_module_css_default.hotTagOn : ""}`,
				onClick: () => toggleTag(t)
			}, t))), hotAll.length > 8 ? El("div", { className: styles_module_css_default.tagMoreRow }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnGhost} ${styles_module_css_default.btnSm}`,
				onClick: () => setHotExpanded((v) => !v)
			}, hotExpanded ? "收起标签" : "展开全部标签")) : null, semanticNotice ? El("p", { className: styles_module_css_default.sceneEmpty, role: "status", "aria-live": "polite" }, semanticNotice) : null, semanticTags.length > 0 ? El("div", { className: styles_module_css_default.semanticResult }, `AI 理解为你想要：`, ...semanticTags.map((t) => El("span", {
				key: t,
				className: `${styles_module_css_default.hotTag} ${tags.includes(t) ? styles_module_css_default.hotTagOn : ""}`,
				onClick: () => toggleTag(t)
			}, t))) : null, searching && results.length === 0 ? El("div", { className: styles_module_css_default.stateHint }, "搜索中…") : results.length === 0 && query === "" && tags.length === 0 && !zhCat ? El("div", { className: styles_module_css_default.stateHint }, "输入关键词、选择中文分类或标签开始搜索") : results.length === 0 ? El("div", { className: styles_module_css_default.emptyState }, El("div", { className: styles_module_css_default.emptyIcon }, El(Icon, {
				d: ICON_SEARCH,
				size: 44
			})), El("div", { className: styles_module_css_default.emptyTitle }, "没有找到匹配的插件"), El("div", { className: styles_module_css_default.emptyDesc }, "换个关键词或标签试试。")) : El("div", null, El("div", { className: styles_module_css_default.resultCount }, "共 ", El("b", null, String(results.length)), " 个结果"), El("div", { className: styles_module_css_default.results }, ...results.slice(0, visible).map((r) => El(PluginCard, {
				key: r.plugin.id,
				plugin: r.plugin,
				reasons: r.aiReason ? [`AI：${r.aiReason}`] : r.via && r.via.length > 0 ? [`匹配「${r.via.join("」「")}」`] : r.tagHits > 0 ? [`标签命中 ${r.tagHits} 项`] : void 0,
				onInstall,
				onTagClick
			}))), visible < results.length ? El("div", { className: styles_module_css_default.loadMoreRow }, El("button", {
				className: styles_module_css_default.loadMore,
				onClick: () => setVisible((v) => v + 50)
			}, `加载更多（还有 ${results.length - visible} 个）`)) : null));
		}
		// Native inventory identities stay independent of ambiguous market matching.
		function hasInstalledIdentity(item) {
			return typeof item?.localName === "string" && Boolean(item.localName.trim()) && Boolean(item.pluginId || (typeof item.nativeBundle === "string" && item.nativeBundle.trim()));
		}
		function installedOperationArgs(item) {
			return { localName: item.localName, ...(item.pluginId ? { pluginId: item.pluginId } : {}) };
		}
		function installedMutationRestriction(item) {
			if (item?.localName === "@dsh-market/plugin" || item?.nativeBundle === "@dsh-market/plugin") return "市场自身请使用内建插件管理器更新或移除，不能在市场内操作。";
			if (item?.removable === false) return "宿主将此套件标记为不可移除，市场不提供更新或移除；请使用内建插件管理器查看。";
			return "";
		}
		function InstalledTab(props) {
			const { installed, loading, onChanged } = props;
			const [confirming, setConfirming] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [showAllUnmatched, setShowAllUnmatched] = (0, react.useState)(false);
			const [updateMap, setUpdateMap] = (0, react.useState)({});
			const [checking, setChecking] = (0, react.useState)(false);
			const [checkError, setCheckError] = (0, react.useState)("");
			const [updating, setUpdating] = (0, react.useState)(null);
			const [verifMap, setVerifMap] = (0, react.useState)({});
			const [verifying, setVerifying] = (0, react.useState)(null);
			const [operationNotice, setOperationNotice] = (0, react.useState)("");
			const reportOperation = (message) => { setOperationNotice(message); toast(message, 6000); };
			const uninstall = async (item) => {
				if (!hasInstalledIdentity(item)) return;
				const restriction = installedMutationRestriction(item);
				if (restriction) { reportOperation(restriction); return; }
				setBusy(true);
				setOperationNotice("");
				try {
					const r = await api("uninstall", installedOperationArgs(item));
					if (r.ok !== true || r.applied === false) {
						reportOperation(operationFailure("卸载", r));
						return;
					}
					onChanged();
					reportOperation(`卸载完成；${applicationText(r)}${warningText(r) ? `；警告：${warningText(r)}` : ""}`);
				} catch (e) {
					reportOperation(`卸载失败：${e.message}`);
				} finally {
					setBusy(false);
					setConfirming(null);
				}
			};
			/** 检查更新（force：绕过 core 内存缓存，重新查 npm / GitHub） */
			const checkNow = async () => {
				setChecking(true);
				setCheckError("");
				try {
					const list = await api("update:check", { force: true });
					const m = {};
					for (const r of list) m[r.localName] = r;
					setUpdateMap(m);
				} catch (e) {
					setCheckError(e.message);
				} finally {
					setChecking(false);
				}
			};
			/** P0-1 装后四态验证：对单个已装项手动触发（读 profile 真值） */
			const verifyOne = async (item) => {
				if (!hasInstalledIdentity(item) || verifying) return;
				setVerifying(item.localName);
				try {
					const a = await api("verify", installedOperationArgs(item));
					setVerifMap((m) => ({
						...m,
						[item.localName]: a
					}));
					toast(`「${item.localName}」：${activationText(a)}`, 3200);
				} catch (e) {
					toast(`验证失败：${e.message}`, 3e3);
				} finally {
					setVerifying(null);
				}
			};
			/** Native manager owns approvals and rollback. Never auto-approve or retry a failed update. */
			const updatePlugin = async (item) => {
				if (!hasInstalledIdentity(item) || updating) return;
				const restriction = installedMutationRestriction(item);
				if (restriction) { reportOperation(restriction); return; }
				setUpdating(item.localName);
				setOperationNotice("");
				try {
					const r = await api("update:apply", installedOperationArgs(item));
					if (r.ok === false || r.error) {
						reportOperation(operationFailure("更新", r));
						return;
					}
					if (r.blocked) {
						reportOperation("更新未完成：" + (r.reason || r.blocked) + "；请前往内建插件管理器检查或确认，未自动重试。");
						return;
					}
					if (r.noChange && !r.applied) {
						reportOperation(r.reason ?? "版本无变化");
						return;
					}
					if (r.ok !== true || r.applied === false) {
						reportOperation(operationFailure("更新", r));
						return;
					}
					onChanged();
					setUpdateMap((m) => {
						const next = { ...m };
						delete next[item.localName];
						return next;
					});
					const act = r.activation;
					reportOperation("更新完成；" + applicationText(r) + (act ? " · " + activationText(act) : "") + (warningText(r) ? "；警告：" + warningText(r) : ""));
					if (act) setVerifMap((m) => ({ ...m, [item.localName]: act }));
				} catch (e) {
					reportOperation("更新失败：" + e.message);
				} finally {
					setUpdating(null);
				}
			};
			/** 单行检测状态（未检测过返回 null） */
			const renderCheck = (item) => {
				const r = updateMap[item.localName];
				if (!r) return null;
				return El("div", { className: r.hasUpdate === true && !r.error && !r.stale ? styles_module_css_default.updateChip : styles_module_css_default.updateHint }, sourceUpdateText(r), r.sourceURL ? El("a", { href: r.sourceURL, target: "_blank", rel: "noopener noreferrer" }, " 查看安裝來源") : null);
			};
			if (loading) return El("div", { className: styles_module_css_default.stateHint }, "扫描已装插件…");
			const manageable = installed.filter(hasInstalledIdentity);
			const unmatched = installed.filter((i) => !hasInstalledIdentity(i));
			return El("div", { className: styles_module_css_default.tabBody }, El("div", { className: styles_module_css_default.section }, El("div", { className: styles_module_css_default.sectionHead }, El(Icon, {
				d: ICON_PACKAGE,
				size: 14,
				className: styles_module_css_default.sectionIcon
			}), El("h3", { className: styles_module_css_default.sectionTitle }, "已安装"), El("span", { className: styles_module_css_default.sectionNote }, `${installed.length} 个`), installed.length > 0 ? El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm} ${styles_module_css_default.btnGhost}`,
				disabled: checking,
				onClick: () => void checkNow()
			}, checking ? "检测中…" : "检查更新") : null), operationNotice ? El("p", { className: styles_module_css_default.warn, role: "status", "aria-live": "polite" }, operationNotice) : null, checkError ? El("div", { className: styles_module_css_default.updateHint }, `检测失败：${checkError}`) : null, manageable.length === 0 ? El("div", { className: styles_module_css_default.stateHint }, "未检测到可按宿主套件名称管理的已装插件") : null, ...manageable.map((i, idx) => El("div", {
				key: `${i.localName}-${idx}`,
				className: styles_module_css_default.installedRow
			}, El("div", { className: styles_module_css_default.installedInfo }, El("div", { className: styles_module_css_default.installedHead }, El("span", { className: styles_module_css_default.installedName }, i.plugin?.name ?? i.localName), El("span", { className: styles_module_css_default.cardBadge }, i.source === "skills" ? "技能" : "插件"), !i.pluginId && i.nativeBundle ? El("span", { className: styles_module_css_default.cardBadge }, "依宿主套件名稱管理／未配對市場") : null, i.plugin?.dshCompat && i.plugin.dshCompat.status !== "unknown" ? El("span", {
				className: styles_module_css_default.compatChip,
				"data-status": i.plugin.dshCompat.status,
				title: i.plugin.dshCompat.reason
			}, `推荐 ${i.plugin.dshCompat.label}`, i.plugin.dshCompat.status === "incompatible" && i.plugin.dshCompat.local ? `（当前 ${i.plugin.dshCompat.local}）` : "") : null), El("div", { className: styles_module_css_default.installedMeta }, `${i.version ?? "未知版本"} · ${i.source === "skills" ? "skill" : "profile"}`), installedMutationRestriction(i) ? El("div", { className: styles_module_css_default.updateHint }, installedMutationRestriction(i)) : null, verifMap[i.localName] ? El("div", { className: `${styles_module_css_default.activationChip} ${verifMap[i.localName].state === "live" ? styles_module_css_default.activationLive : verifMap[i.localName].state === "broken" ? styles_module_css_default.activationBroken : verifMap[i.localName].state === "inert" ? styles_module_css_default.activationInert : ""}` }, activationText(verifMap[i.localName])) : null, checking ? El("div", { className: styles_module_css_default.updateHint }, "检测中…") : renderCheck(i)), confirming === i.localName ? El("div", { className: styles_module_css_default.installedActions }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				onClick: () => setConfirming(null)
			}, "取消"), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm} ${styles_module_css_default.btnDanger}`,
				disabled: busy || !hasInstalledIdentity(i) || Boolean(installedMutationRestriction(i)),
				onClick: () => void uninstall(i)
			}, "确认卸载")) : El("div", { className: styles_module_css_default.installedActions }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm} ${styles_module_css_default.btnGhost}`,
				disabled: updating !== null || busy || !hasInstalledIdentity(i) || verifying !== null,
				onClick: () => void verifyOne(i)
			}, verifying === i.localName ? "验证中…" : "验证"), updateMap[i.localName]?.hasUpdate ? El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm} ${styles_module_css_default.btnPrimary}`,
				disabled: updating !== null || busy || Boolean(installedMutationRestriction(i)),
				title: installedMutationRestriction(i) || undefined,
				onClick: () => void updatePlugin(i)
			}, updating === i.localName ? "更新中…" : "更新") : null, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				disabled: busy || updating !== null || !hasInstalledIdentity(i) || Boolean(installedMutationRestriction(i)),
				title: installedMutationRestriction(i) || undefined,
				onClick: () => setConfirming(i.localName)
			}, "卸载"))))), unmatched.length > 0 ? El("div", { className: styles_module_css_default.section }, El("div", { className: styles_module_css_default.sectionHead }, El(Icon, {
				d: ICON_PACKAGE,
				size: 14,
				className: styles_module_css_default.sectionIcon
			}), El("h3", { className: styles_module_css_default.sectionTitle }, "其他已装"), El("span", { className: styles_module_css_default.sectionNote }, `${unmatched.length} 个 · 未配对可管理套件`)), El("div", { className: styles_module_css_default.unmatched }, ...unmatched.slice(0, showAllUnmatched ? unmatched.length : 5).map((i, idx) => El("span", {
				key: `${i.localName}-${idx}`,
				className: styles_module_css_default.unmatchedChip
			}, i.localName)), unmatched.length > 5 ? El("button", {
				type: "button",
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnGhost} ${styles_module_css_default.btnSm}`,
				onClick: () => setShowAllUnmatched((v) => !v)
			}, showAllUnmatched ? "收起" : `查看详细（${unmatched.length} 个）`) : null)) : null);
		}
		function SettingsTab(props) {
			const { profile, onChanged } = props;
			const [ghLogin, setGhLogin] = (0, react.useState)(() => localStorage.getItem(GH_LOGIN_KEY));
			const [ghBusy, setGhBusy] = (0, react.useState)(false);
			const [ghError, setGhError] = (0, react.useState)("");
			const [deviceInfo, setDeviceInfo] = (0, react.useState)(null);
			const [patInput, setPatInput] = (0, react.useState)("");
			const [mode, setMode] = (0, react.useState)(profile?.modeOverride ?? "auto");
			const [profileName, setProfileName] = (0, react.useState)("web");
			const [versions, setVersions] = (0, react.useState)({});
			const [logState, setLogState] = (0, react.useState)("");
			const [backupBusy, setBackupBusy] = (0, react.useState)("");
			const [importSummary, setImportSummary] = (0, react.useState)("");
			const backupFileRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setMode(profile?.modeOverride ?? "auto");
				api("config").then((c) => {
					if (c?.versions) setVersions(c.versions);
				}).catch(() => {});
			}, [profile]);
			const saveSettings = async (patch) => {
				try {
					await api("settings:update", { patch });
					onChanged();
				} catch (e) {
					alert(`保存失败：${e.message}`);
				}
			};
			const [ghPoll, setGhPoll] = (0, react.useState)("idle");
			const [pollDetail, setPollDetail] = (0, react.useState)("");
			const [pollCount, setPollCount] = (0, react.useState)(0);
			/** 导出：RPC 取备份对象 → 浏览器下载 JSON（含收藏；绝不含凭据） */
			const exportBackup = async () => {
				setBackupBusy("exporting");
				try {
					const backup = await api("backup:export", { favorites: readFavorites() });
					const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `dsh-market-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
					a.click();
					URL.revokeObjectURL(url);
					toast("备份已导出（浏览器下载）");
				} catch (e) {
					toast(`导出失败：${e.message}`, 3500);
				} finally {
					setBackupBusy("");
				}
			};
			/** 导入：读 JSON → RPC 合并恢复（补装缺失、不动后来装的）→ 收藏并集合并 */
			const onBackupFile = (e) => {
				const file = e.target.files?.[0];
				e.target.value = "";
				if (!file || backupBusy) return;
				(async () => {
					setBackupBusy("importing");
					setImportSummary("");
					try {
						let backup;
						try {
							backup = JSON.parse(await file.text());
						} catch {
							throw new Error("文件不是合法 JSON");
						}
						const r = await api("backup:import", { backup });
						const incoming = backup.favorites ?? [];
						if (incoming.length > 0) writeFavorites([.../* @__PURE__ */ new Set([...readFavorites(), ...incoming])]);
						setImportSummary(`补装 ${r.restored.length} · 本机已有 ${r.already.length} · 未匹配 ${r.unmatched.length}` + (r.failed.length ? ` · 失败 ${r.failed.length}` : "") + (r.requiresRestart ? " · 重启 harness 后生效" : ""));
						if (r.failed.length > 0) {
							const names = r.failed.slice(0, 3).map((f) => f.name).join("、");
							setImportSummary((s) => `${s}\n失败：${names}${r.failed.length > 3 ? " 等" : ""}`);
						}
						onChanged();
						toast(r.failed.length === 0 ? "备份恢复完成" : "备份恢复完成（部分条目失败，见摘要）", 3600);
					} catch (err) {
						toast(`导入失败：${err.message}`, 4e3);
					} finally {
						setBackupBusy("");
					}
				})();
			};
			const pollIntervalRef = (0, react.useRef)(null);
			const clearPoll = () => {
				if (pollIntervalRef.current !== null) {
					window.clearInterval(pollIntervalRef.current);
					pollIntervalRef.current = null;
				}
			};
			(0, react.useEffect)(() => clearPoll, []);
			const startDeviceFlow = async () => {
				clearPoll();
				setGhBusy(true);
				setGhError("");
				setDeviceInfo(null);
				setGhPoll("waiting");
				try {
					const d = await api("gh:deviceCode", { body: {
						client_id: GH_CLIENT_ID,
						scope: "read:user"
					} });
					if (!d.device_code) {
						setGhError(`设备流不可用：${d.error_description ?? d.error ?? "未知错误"}`);
						setGhPoll("idle");
						setGhBusy(false);
						return;
					}
					setDeviceInfo({
						verification_uri: d.verification_uri ?? "",
						user_code: d.user_code ?? ""
					});
					setGhPoll("polling");
					setPollCount(0);
					setPollDetail("第 1 次轮询…");
					let localCount = 0;
					pollIntervalRef.current = window.setInterval(async () => {
						try {
							const t = await api("gh:token", { body: {
								client_id: GH_CLIENT_ID,
								device_code: d.device_code,
								grant_type: "urn:ietf:params:oauth:grant-type:device_code"
							} });
							localCount++;
							setPollCount(localCount);
							if (t.access_token) {
								clearPoll();
								setGhPoll("finishing");
								setPollDetail("拿到 token，正在同步加星…");
								await finishBind(t.access_token, "device");
								setGhPoll("done");
							} else if (t.error === "authorization_pending") setPollDetail(`第 ${localCount} 次：GitHub 尚未确认授权（继续等待…）`);
							else if (t.error === "slow_down") setPollDetail(`第 ${localCount} 次：GitHub 要求放慢轮询（继续等待…）`);
							else {
								clearPoll();
								setGhError(t.error_description ?? t.error ?? "授权失败");
								setGhPoll("idle");
								setGhBusy(false);
							}
						} catch (e) {
							clearPoll();
							setGhError(e.message);
							setGhPoll("idle");
							setGhBusy(false);
						}
					}, (d.interval ?? 5) * 1e3);
				} catch (e) {
					setGhError(e.message);
					setGhBusy(false);
				}
			};
			const finishBind = async (token, method) => {
				try {
					const user = await api("gh:user", { token });
					localStorage.setItem(GH_TOKEN_KEY, token);
					localStorage.setItem(GH_LOGIN_KEY, user.login);
					localStorage.setItem(GH_METHOD_KEY, method);
					setGhLogin(user.login);
					setGhBusy(false);
					setDeviceInfo(null);
					await api("profile:update", { starredFullNames: await api("gh:starred", { token }) });
					onChanged();
				} catch (e) {
					setGhError(`绑定失败：${e.message}`);
					setGhBusy(false);
				}
			};
			const bindWithPat = async () => {
				if (!patInput.trim()) return;
				setGhBusy(true);
				setGhError("");
				try {
					await finishBind(patInput.trim(), "pat");
					setPatInput("");
				} catch (e) {
					setGhError(e.message);
					setGhBusy(false);
				}
			};
			const unbind = () => {
				localStorage.removeItem(GH_TOKEN_KEY);
				localStorage.removeItem(GH_LOGIN_KEY);
				localStorage.removeItem(GH_METHOD_KEY);
				setGhLogin(null);
				onChanged();
			};
			return El("div", { className: styles_module_css_default.tabBody }, El("div", { className: styles_module_css_default.settingCard }, El("div", { className: styles_module_css_default.settingHead }, El("span", { className: styles_module_css_default.settingIc }, El(Icon, {
				d: ICON_GITHUB,
				size: 15
			})), El("span", { className: styles_module_css_default.settingTitle }, "GitHub 账户"), El("span", { className: `${styles_module_css_default.settingStatus} ${ghLogin ? styles_module_css_default.statusOk : styles_module_css_default.statusOff}` }, ghLogin ? "已绑定" : "未绑定")), ghLogin ? El("div", null, El("p", { className: styles_module_css_default.ghTip }, `已绑定 @${ghLogin}，读取公开加星用于个性化推荐（token 仅存本机浏览器）。`), El("div", { className: styles_module_css_default.settingsRow }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				onClick: unbind
			}, "解除绑定"))) : El("div", null, El("div", { className: styles_module_css_default.fieldRow }, El("div", { className: styles_module_css_default.field }, El("label", { className: styles_module_css_default.fieldLabel }, "Token（Personal Access Token）"), El("input", {
				className: styles_module_css_default.input,
				type: "password",
				placeholder: "ghp_…",
				value: patInput,
				onChange: (e) => setPatInput(e.target.value)
			}))), El("div", { className: styles_module_css_default.settingsRow }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				disabled: ghBusy,
				onClick: () => void bindWithPat()
			}, "Token 绑定（完整功能）"), El("button", {
				className: styles_module_css_default.btn,
				disabled: ghBusy,
				onClick: () => void startDeviceFlow()
			}, "快速授权（仅推荐）")), El("p", { className: styles_module_css_default.ghTip }, "Token 绑定 = 完整功能（读取加星推荐 + 一键加星）；快速授权只能读取公开加星做推荐。", " ", El("a", {
				href: "https://github.com/settings/tokens/new?scopes=public_repo,read:user&description=dsh-market",
				target: "_blank",
				rel: "noopener noreferrer",
				className: styles_module_css_default.ghLink
			}, "生成 Token（public_repo + read:user）", El(Icon, {
				d: ICON_EXTERNAL,
				size: 11,
				className: styles_module_css_default.inlineIcon
			}))), deviceInfo ? El("div", { className: styles_module_css_default.deviceFlow }, El("p", null, "在 GitHub 输入授权码："), El("code", { className: styles_module_css_default.deviceCode }, deviceInfo.user_code), El("p", null, El("a", {
				href: deviceInfo.verification_uri,
				target: "_blank",
				rel: "noopener noreferrer"
			}, "前往 GitHub 授权", El(Icon, {
				d: ICON_EXTERNAL,
				size: 11,
				className: styles_module_css_default.inlineIcon
			}))), El("p", { className: styles_module_css_default.deviceFlowTip }, "输入授权码后，请点击 GitHub 页面上的「Authorize / 授权」按钮完成确认，然后回到这里等待自动绑定。"), El("p", { className: styles_module_css_default.ghPollState }, ghPoll === "polling" ? pollDetail || "等待授权…（授权完成后自动绑定）" : ghPoll === "finishing" ? pollDetail || "授权成功，正在同步加星…" : ghPoll === "done" ? El("span", { className: styles_module_css_default.ghDone }, El(Icon, {
				d: ICON_CHECK,
				size: 13,
				className: styles_module_css_default.inlineIcon
			}), "绑定完成") : ""), ghPoll === "polling" && pollCount >= 36 ? El("p", { className: styles_module_css_default.deviceFlowTip }, "已等待较久：请确认 GitHub 页面已完成「Authorize」确认；若授权码已过期（15 分钟），点「重新获取授权码」。") : null, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				disabled: ghBusy,
				onClick: () => void startDeviceFlow()
			}, "重新获取授权码")) : null, ghError ? El("p", { className: styles_module_css_default.error }, ghError) : null)), El("div", { className: styles_module_css_default.settingCard }, El("div", { className: styles_module_css_default.settingHead }, El("span", { className: styles_module_css_default.settingIc }, El(Icon, {
				d: ICON_MODE,
				size: 15
			})), El("span", { className: styles_module_css_default.settingTitle }, "推荐偏好")), El("div", { className: styles_module_css_default.field }, El("label", { className: styles_module_css_default.fieldLabel }, "推荐模式"), El("select", {
				className: styles_module_css_default.select,
				value: mode,
				onChange: (e) => {
					setMode(e.target.value);
					saveSettings({ modeOverride: e.target.value });
				}
			}, El("option", { value: "auto" }, "自动（按画像判断）"), El("option", { value: "novice" }, "新手模式"), El("option", { value: "veteran" }, "个性化模式"))), El("div", { className: styles_module_css_default.field }, El("label", { className: styles_module_css_default.fieldLabel }, "目标 Profile"), El("input", {
				className: styles_module_css_default.input,
				value: profileName,
				onChange: (e) => {
					setProfileName(e.target.value);
					saveSettings({ profile: e.target.value });
				}
			})), El("p", { className: styles_module_css_default.ghTip }, `已装 skill 目录：从本机 skills 目录自动检测`), El("div", { className: styles_module_css_default.dividerLine }), El("button", {
				className: styles_module_css_default.btn,
				onClick: onChanged
			}, "刷新推荐数据")), El("div", { className: styles_module_css_default.settingCard }, El("div", { className: styles_module_css_default.settingHead }, El("span", { className: styles_module_css_default.settingIc }, El(Icon, {
				d: ICON_PACKAGE,
				size: 15
			})), El("span", { className: styles_module_css_default.settingTitle }, "备份与恢复")), El("p", { className: styles_module_css_default.ghTip }, "导出已装清单 / 收藏 / 偏好为 JSON；换机或重装后导入，只补装缺失的插件，绝不动后来装的。备份不含任何凭据。"), El("div", { className: styles_module_css_default.settingsRow }, El("button", {
				className: styles_module_css_default.btn,
				disabled: backupBusy !== "",
				onClick: () => void exportBackup()
			}, backupBusy === "exporting" ? "导出中…" : "导出备份"), El("button", {
				className: styles_module_css_default.btn,
				disabled: backupBusy !== "",
				onClick: () => backupFileRef.current?.click()
			}, backupBusy === "importing" ? "恢复中…" : "导入恢复"), El("input", {
				type: "file",
				accept: "application/json,.json",
				style: { display: "none" },
				ref: backupFileRef,
				onChange: onBackupFile
			})), importSummary ? El("p", {
				className: styles_module_css_default.ghTip,
				style: {
					whiteSpace: "pre-line",
					marginTop: 6
				}
			}, importSummary) : null), El("div", { className: styles_module_css_default.settingCard }, El("div", { className: styles_module_css_default.settingHead }, El("span", { className: styles_module_css_default.settingIc }, El(Icon, {
				d: ICON_CLOCK,
				size: 15
			})), El("span", { className: styles_module_css_default.settingTitle }, "关于")), El("p", { className: styles_module_css_default.ghTip }, "数据缓存于本地（GitHub Actions 每日抓取）。"), versions["@dsh-market/plugin"] ? El("div", { className: styles_module_css_default.versionRow }, El("span", { className: styles_module_css_default.versionLabel }, "插件版本"), El("code", { className: styles_module_css_default.versionCode }, `${versions["@dsh-market/plugin"] ?? "?"}`, versions["@dsh-market/core"] ? ` · core ${versions["@dsh-market/core"]}` : "")) : null, El("div", { className: styles_module_css_default.versionRow }, El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm}`,
				disabled: logState === "copying",
				onClick: () => void (async () => {
					setLogState("copying");
					try {
						const ok = await copyText(await api("log:export"));
						setLogState(ok ? "copied" : "failed");
					} catch {
						setLogState("failed");
					}
					setTimeout(() => setLogState(""), 2200);
				})()
			}, logState === "copying" ? "导出中…" : "导出操作日志"), El("span", { className: styles_module_css_default.updateHint }, logState === "copied" ? "已复制到剪贴板 ✓（含宿主版本/时区/最近 200 条）" : logState === "failed" ? "复制失败，请重试" : "复制安装/更新/卸载记录，粘给 AI 可大幅加速排查"))));
		}
		function PacksTab(props) {
			const { packs } = props;
			const [query, setQuery] = (0, react.useState)("");
			const [expanded, setExpanded] = (0, react.useState)(null);
			const ql = query.trim().toLowerCase();
			const visible = [...packs].sort((a, b) => b.scoreTotal - a.scoreTotal).filter((p) => !ql || p.name.toLowerCase().includes(ql) || (p.descriptionZh ?? "").toLowerCase().includes(ql) || p.author.toLowerCase().includes(ql) || p.tags.some((t) => t.toLowerCase().includes(ql)));
			return El("div", { className: styles_module_css_default.tabBody }, El("div", { className: styles_module_css_default.searchWrap }, El("span", { className: styles_module_css_default.searchWrapIcon }, El(Icon, {
				d: ICON_SEARCH,
				size: 15
			})), El("input", {
				className: styles_module_css_default.searchInput,
				placeholder: "搜索整合包：翻译 / 安全 / MCP / 环境…",
				value: query,
				onChange: (e) => setQuery(e.target.value)
			}), query.length > 0 ? El("button", {
				className: styles_module_css_default.searchClear,
				"aria-label": "清除",
				onClick: () => setQuery("")
			}, El(Icon, {
				d: ICON_CLOSE,
				size: 13
			})) : null), packs.length === 0 ? El("div", { className: styles_module_css_default.emptyState }, "整合包正式协议开发中，暂未开放收录——敬请期待。") : visible.length === 0 ? El("div", { className: styles_module_css_default.emptyState }, "没有匹配的整合包，换个关键词试试。") : El("div", {
				className: styles_module_css_default.list,
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				}
			}, ...visible.map((p) => {
				const { total, ok, inMarket } = p.entryStats;
				const rate = total > 0 ? Math.round(ok / total * 100) : 0;
				const open = expanded === p.id;
				return El("div", {
					key: p.id,
					className: styles_module_css_default.card
				}, El("div", { className: styles_module_css_default.cardTop }, El("span", {
					className: styles_module_css_default.cardStars,
					style: {
						background: "var(--mkt-purple-bg)",
						color: "var(--mkt-purple)",
						borderRadius: 6,
						padding: "2px 8px",
						fontSize: 10
					}
				}, "PACK"), El("span", { className: styles_module_css_default.cardStars }, `★ ${fmtStars(p.stars)}`)), El("div", { className: styles_module_css_default.cardName }, p.name), El("div", { className: styles_module_css_default.cardDesc }, p.descriptionZh ?? "（无简介）"), El("div", { style: {
					display: "flex",
					alignItems: "center",
					gap: 6,
					fontSize: 11,
					color: rate >= 80 ? "var(--mkt-rate-ok)" : rate >= 50 ? "var(--mkt-rate-warn)" : "var(--mkt-rate-danger)",
					padding: "4px 8px",
					borderRadius: 6,
					background: "var(--mkt-bg)",
					marginBottom: 8
				} }, `✓ ${ok}/${total} 条目可解析 · ${inMarket} 已在市场`, El("b", {}, `${rate}%`)), El("div", { className: styles_module_css_default.cardActions }, El("span", { style: {
					fontSize: 12,
					fontWeight: 600,
					color: "var(--mkt-purple)"
				} }, `${p.scoreTotal} 实用分`), El("button", {
					className: `${styles_module_css_default.btn} ${styles_module_css_default.btnSm} ${styles_module_css_default.btnGhost}`,
					onClick: () => setExpanded(open ? null : p.id)
				}, open ? "收起条目" : "查看条目")), open ? El("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 4,
					marginTop: 8,
					paddingTop: 8,
					borderTop: "1px solid var(--mkt-border)"
				} }, ...p.entries.map((e, i) => El("div", {
					key: `${e.id}-${i}`,
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontSize: 11,
						color: e.resolved?.ok ? "inherit" : "#B33A3A",
						padding: "3px 0"
					}
				}, El("span", {}, e.resolved?.ok ? "✓" : "✗"), El("code", { style: { fontSize: 10.5 } }, e.id), El("span", { style: {
					fontSize: 10,
					color: "var(--mkt-text3)"
				} }, e.type), El("span", { style: {
					marginLeft: "auto",
					fontSize: 10,
					color: "var(--mkt-text3)"
				} }, e.resolved?.ok ? e.resolved.inMarket ? "已在市场" : "可安装" : e.resolved?.reason ?? "解析失败")))) : null);
			})));
		}
		function FavoritesTab(props) {
			const { plugins, onInstall, onTagClick, refreshTick, onGotoRecommend } = props;
			const favIds = (0, react.useMemo)(() => readFavorites(), [refreshTick]);
			const items = plugins.filter((p) => favIds.includes(p.id));
			return El("div", { className: styles_module_css_default.tabBody }, El("div", { className: styles_module_css_default.sectionHead }, El(Icon, {
				d: ICON_STAR_OUTLINE,
				size: 14,
				className: styles_module_css_default.sectionIcon
			}), El("h3", { className: styles_module_css_default.sectionTitle }, "我的收藏"), El("span", { className: styles_module_css_default.sectionNote }, `${items.length} 个`)), items.length === 0 ? El("div", { className: styles_module_css_default.emptyState }, El("div", { className: styles_module_css_default.emptyIcon }, El(Icon, {
				d: ICON_STAR_OUTLINE,
				size: 44
			})), El("div", { className: styles_module_css_default.emptyTitle }, "还没有收藏任何插件"), El("div", { className: styles_module_css_default.emptyDesc }, "在推荐或搜索页点击星标，把喜欢的插件收藏到这里。"), El("button", {
				className: `${styles_module_css_default.btn} ${styles_module_css_default.btnPrimary}`,
				onClick: onGotoRecommend
			}, "去逛逛")) : El("div", { className: styles_module_css_default.grid2 }, ...items.map((p) => El(PluginCard, {
				key: p.id,
				plugin: p,
				onInstall,
				onTagClick
			}))));
		}
		function MarketPanel(props) {
			const { onClose, mode = "overlay" } = props;
			const storeOpen = (0, react.useSyncExternalStore)(subscribe, getOpen, getOpen);
			const open = mode === "main" ? true : storeOpen;
			const [tab, setTab] = (0, react.useState)("recommend");
			const [plugins, setPlugins] = (0, react.useState)([]);
			const [profile, setProfile] = (0, react.useState)(null);
			const [installed, setInstalled] = (0, react.useState)([]);
			const [packs, setPacks] = (0, react.useState)([]);
			const [recs, setRecs] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(false);
			const [installTarget, setInstallTarget] = (0, react.useState)(null);
			const [refreshKey, setRefreshKey] = (0, react.useState)(0);
			const [sceneState, setSceneState] = (0, react.useState)({
				loading: false,
				recs: [],
				sceneTags: []
			});
			const [loadError, setLoadError] = (0, react.useState)(null);
			const [resuming, setResuming] = (0, react.useState)(null);
			const [resumeError, setResumeError] = (0, react.useState)("");
			const loadAll = async () => {
				setLoading(true);
				setLoadError(null);
				try {
					const [pl, prof, inst] = await Promise.all([
						api("plugins"),
						api("profile:read"),
						api("installed")
					]);
					setPlugins(pl);
					setProfile(prof);
					setInstalled(inst);
					api("packs").then((pk) => setPacks(pk)).catch(() => {});
					const counts = /* @__PURE__ */ new Map();
					for (const i of inst) {
						if (!i.plugin) continue;
						for (const t of i.plugin.tags) {
							if (!/[\u4e00-\u9fff]/.test(t)) continue;
							if ([
								"效率工具",
								"开发辅助",
								"AI 增强",
								"AI增强",
								"自动化"
							].includes(t)) continue;
							counts.set(t, (counts.get(t) ?? 0) + 1);
						}
					}
					const sceneTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
					const r = await api("recommend", { options: {
						limit: 24,
						excludeIds: inst.filter((i) => i.pluginId).map((i) => i.pluginId),
						sceneTags
					} });
					setRecs(r);
				} catch (e) {
					console.error("market load failed:", e);
					setLoadError(e);
				} finally {
					setLoading(false);
				}
			};
			(0, react.useEffect)(() => {
				if (open) loadAll();
			}, [open, refreshKey]);
			// Portable/fork versions are not ordered against upstream official releases.
			// Do not query or advertise the official self-update channel in this edition.
			(0, react.useEffect)(() => {
				if (!open) return;
				setResuming(null);
				const raw = localStorage.getItem(PENDING_INSTALL_KEY);
				if (!raw) return;
				let entry;
				try {
					entry = JSON.parse(raw);
					if (!entry || typeof entry.installId !== "string" || !entry.installId.trim()) throw new Error("无效安装任务记录");
				} catch {
					setResumeError("无法恢复安装：本地等待记录无效，已清除。无法确认安装结果；未取消后台安装，请检查安装话题或「已装」列表。");
					localStorage.removeItem(PENDING_INSTALL_KEY);
					return;
				}
				setResumeError("");
				setResuming({ pluginName: entry.pluginName });
				return watchInstallStatus(entry.installId, (s) => {
					setResuming(null);
					if (s.cancelled) toast(`「${entry.pluginName}」安装已取消`, 3e3);
					else if (s.ok === true && s.applied !== false) {
						toast(`「${entry.pluginName}」安装完成；${applicationText(s)}${warningText(s) ? `；警告：${warningText(s)}` : ""}`, 8e3);
						setRefreshKey((k) => k + 1);
					} else setResumeError(`「${entry.pluginName}」${operationFailure("安装", s)}`);
				}, (message) => {
					setResuming(null);
					setResumeError(`「${entry.pluginName}」${message}`);
				}, (s) => setResuming({ pluginName: entry.pluginName, message: installStageText(s) }));
			}, [open]);

			if (!open) return null;
			const installedIds = new Set(installed.filter((i) => i.pluginId).map((i) => i.pluginId));
			const onTagClick = (t) => {
				setSearchSeed(t);
				setTab("search");
			};
			const onInstalledChanged = () => setRefreshKey((k) => k + 1);
			const onFetchScene = async () => {
				setSceneState({
					loading: true,
					recs: [],
					sceneTags: []
				});
				try {
					const tags = (await api("scene:context")).sceneTags ?? [];
					if (tags.length === 0) {
						setSceneState({
							loading: false,
							recs: [],
							sceneTags: []
						});
						return;
					}
					const r = await api("recommend", { options: {
						limit: 24,
						excludeIds: installed.filter((i) => i.pluginId).map((i) => i.pluginId),
						sceneTags: tags
					} });
					setSceneState({
						loading: false,
						recs: r.filter((x) => x.origin === "scene"),
						sceneTags: tags
					});
				} catch (e) {
					console.error("fetch scene failed:", e);
					setSceneState({
						loading: false,
						recs: [],
						sceneTags: []
					});
				}
			};
			const onSwitchMode = async () => {
				const cur = profile?.modeOverride ?? "auto";
				const next = cur === "novice" || cur === "auto" && (profile?.confidence ?? 0) < .4 ? "auto" : "novice";
				try {
					await api("settings:update", { patch: { modeOverride: next } });
					if (next === "novice") markQuizTriggered();
					onInstalledChanged();
				} catch (e) {
					console.error("switch mode failed:", e);
				}
			};
			const tabs = [
				{
					id: "recommend",
					label: "推荐"
				},
				{
					id: "search",
					label: "搜索"
				},
				{
					id: "packs",
					label: "整合包"
				},
				{
					id: "favorites",
					label: "收藏"
				},
				{
					id: "installed",
					label: "已装"
				},
				{ id: "tasks", label: "安裝任務" },
				{
					id: "settings",
					label: "设置"
				}
			];
			const inMain = mode === "main";
			return El("div", inMain ? { className: styles_module_css_default.mainHost } : {
				className: styles_module_css_default.backdrop,
				onClick: onClose
			}, El("div", inMain ? { className: `${styles_module_css_default.panel} ${styles_module_css_default.panelInMain}` } : {
				className: styles_module_css_default.panel,
				onClick: (e) => e.stopPropagation()
			}, El("div", { className: styles_module_css_default.header }, El("span", { className: styles_module_css_default.titleIcon }, El(MarketLogo, {
				size: 24,
				color: "var(--mkt-brand)",
				eyeColor: "#FFFFFF"
			})), El("span", { className: styles_module_css_default.title }, "插件市场"), El("span", { className: styles_module_css_default.subtitle }, `${plugins.length} 个插件`), El("button", {
				className: styles_module_css_default.headerClose,
				onClick: onClose,
				"aria-label": "关闭"
			}, El(Icon, {
				d: ICON_CLOSE,
				size: 14
			}))), El("p", { className: styles_module_css_default.ghTip }, "Portable / fork 任務追蹤版 .2：不以官方版本判斷更新。", El("a", { href: "https://github.com/n4714806/dsh-market/tags", target: "_blank", rel: "noopener noreferrer" }, "查看 fork 版本說明")), El(IndexFreshness, { onRefreshed: () => setRefreshKey((n) => n + 1) }), resumeError ? El("div", { className: styles_module_css_default.error, role: "alert" }, resumeError) : null, resuming ? El("div", { className: styles_module_css_default.selfUpdateBar }, El("span", { className: styles_module_css_default.selfUpdateText }, `正在后台安装「${resuming.pluginName}」：${resuming.message || "等待宿主状态"}。可离开此页面，完成后会提示`)) : null, El("div", { className: styles_module_css_default.tabs }, ...tabs.map((t) => El("button", {
				key: t.id,
				className: `${styles_module_css_default.tab} ${tab === t.id ? styles_module_css_default.tabOn : ""}`,
				onClick: () => setTab(t.id)
			}, t.label))), El("div", { className: styles_module_css_default.body }, tab === "tasks" ? El(Boundary, { key: tab, label: "安裝任務" }, El(TasksTab)) : loadError ? El(ErrorOutlet, {
				error: loadError,
				label: "数据加载",
				onRetry: () => void loadAll()
			}) : tab === "recommend" ? El(Boundary, {
				key: tab,
				label: "推荐 Tab"
			}, El(RecommendTab, {
				plugins,
				profile,
				recs,
				loading,
				installedIds,
				onInstall: setInstallTarget,
				onTagClick,
				onSwitchMode,
				onQuizSubmit: async (tags) => {
					await api("profile:update", { quizTags: tags });
					onInstalledChanged();
				},
				sceneState,
				onFetchScene
			})) : tab === "search" ? El(Boundary, {
				key: tab,
				label: "搜索 Tab"
			}, El(SearchTab, {
				plugins,
				onInstall: setInstallTarget,
				onTagClick
			})) : tab === "packs" ? El(Boundary, {
				key: tab,
				label: "整合包 Tab"
			}, El(PacksTab, {
				packs,
				onInstallPack: (pack) => {
					window.open(`https://github.com/${pack.id}`, "_blank");
				}
			})) : tab === "favorites" ? El(Boundary, {
				key: tab,
				label: "收藏 Tab"
			}, El(FavoritesTab, {
				plugins,
				onInstall: setInstallTarget,
				onTagClick,
				refreshTick: refreshKey,
				onGotoRecommend: () => setTab("recommend")
			})) : tab === "installed" ? El(Boundary, {
				key: tab,
				label: "已装 Tab"
			}, El(InstalledTab, {
				installed,
				loading,
				onChanged: onInstalledChanged
			})) : El(Boundary, {
				key: tab,
				label: "设置 Tab"
			}, El(SettingsTab, {
				profile,
				onChanged: onInstalledChanged
			}))), installTarget ? El(Boundary, {
				key: installTarget.id,
				label: "安装弹窗"
			}, El(InstallModal, {
				plugin: installTarget,
				onViewTasks: () => { setInstallTarget(null); setTab("tasks"); },
				onDone: onInstalledChanged,
				onClose: () => setInstallTarget(null)
			})) : null));
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* @dsh-market/plugin client half —— 双路注册（按宿主能力探测，同一份产物兼容两代 DSH）：
		*
		*  A. 0.1.5+ 标准面板入口：`sidebar.panellist`（左栏导航图标）+ `main`（中央面板）。
		*     按契约，panellist 的 `id` 必须与 main 的 `key` 同名——sidebar 点击时调
		*     `layout.selectPanel(id)`，而 selectPanel 会按 key 反查 main 注册项，对不上直接抛错。
		*  B. ≤0.1.4 旧入口：`sidebar.footer.action`（侧栏底部按钮）+ `shell.overlay`（浮层模态）。
		*
		*  探测点：`layout.selectPanel`。两代 `root` slot 的子节点完全不同——旧版是
		*  `sidebar`/`conversation`/`details`/`shell.overlay`（**没有 main、也没有 panellist**），
		*  新版是 `sidebar`/`main`/`rightbar`/`shell.overlay`；layout 服务的方法集同样不重叠：
		*  旧版 `attachPanels/toggleSidebar/openDetails/closeDetails`，新版 `selectPanel/...`。
		*  两代都 `provide('layout')`，故 `inject: ['slots', 'layout']` 在两代均成立；同时 inject
		*  layout 也保证了探测时它已就绪（只 inject slots 的话可能先于 layout 就绪而误判成旧版）。
		*/
		/** 面板 id == main slot 的 key（两者必须同名，见文件头 A） */
		const PANEL_ID = "dsh-market";
		/** 旧版入口按钮：侧边栏底部「设置」旁的图标按钮（issue #101：独占一行 + 16px 图标对齐官方） */
		function MarketTrigger(props) {
			const open = (0, react.useSyncExternalStore)(subscribe, getOpen, getOpen);
			return (0, react.createElement)("button", {
				className: styles_module_css_default.trigger,
				onClick: toggle,
				title: "插件市场",
				"aria-label": "插件市场",
				"data-active": open || void 0
			}, (0, react.createElement)("span", { className: styles_module_css_default.triggerIcon }, (0, react.createElement)(MarketLogo, {
				size: 16,
				color: open ? "currentColor" : "currentColor"
			})), props.wide ? (0, react.createElement)("span", { className: styles_module_css_default.triggerLabel }, "插件市场") : null);
		}
		/**
		* 0.1.5 左栏导航图标。owner 传入 `{ size, active }`，并把图标渲染在 `.panelRow`
		* 之内（未选中 color=label-secondary、选中=label-primary），所以这里用
		* currentColor 即可自动跟随选中态，不需要自己读 active 改色。
		*/
		function MarketRailIcon(props) {
			return (0, react.createElement)(MarketLogo, {
				size: props.size,
				color: "currentColor"
			});
		}
		const inject = ["slots", "layout"];
		function apply(ctx) {
			const layout = ctx.get("layout");
			if (typeof layout?.selectPanel === "function") {
				ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
					name: "sidebar.panellist",
					id: PANEL_ID,
					order: 5,
					label: "插件市场"
				}, (props) => (0, react.createElement)(MarketRailIcon, props)));
				ctx.slots.inject("main", () => ctx.slots.register({
					name: "main",
					key: PANEL_ID
				}, () => (0, react.createElement)(Boundary, {
					key: PANEL_ID,
					label: "面板整体"
				}, (0, react.createElement)(MarketPanel, {
					mode: "main",
					onClose: () => layout.selectPanel?.(null)
				}))));
				return;
			}
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: PANEL_ID,
				order: 5,
				label: "插件市场"
			}, (props) => (0, react.createElement)(MarketTrigger, { wide: props.wide })));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-market-panel",
				order: 10
			}, () => (0, react.createElement)(Boundary, {
				key: "dsh-market-panel",
				label: "面板整体"
			}, (0, react.createElement)(MarketPanel, {
				mode: "overlay",
				onClose: () => setOpen(false)
			}))));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map