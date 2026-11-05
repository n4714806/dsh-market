// Both the UI and this tool call the same controller. No approval-granting or
// installation action is exposed by this preparation-only workbench.
export function compatTool(workbench){
 return {
  name:'market_compat',deferLoading:true,
  description:'Analyze a public npm plugin for this DSH release, or explicitly request a tool-free AI patch draft. Never installs, executes third-party code, grants exemptions, or validates runtime behavior. Preparation tasks persist; inspect their status rather than retrying generation. Draft generation may incur model charges.',
  parameters:{type:'object',properties:{action:{type:'string',enum:['prepare','generate','list','get','cancel','check-upstream','artifact'],description:'prepare checks version declarations without AI; generate requests one AI draft from an analyzed task; artifact reads its unverified JSON evidence.'},packageName:{type:'string',description:'Exact public npm package name; required for prepare.'},id:{type:'string',description:'Task id from a prior result; required except for prepare and list.'},requestId:{type:'string',description:'Unique 1–128 character letters/digits/hyphens/underscores id for prepare or generate; reuse only for the same request, to prevent duplicate work.'}},required:['action'],additionalProperties:false},
  output:{schema:{type:'object',additionalProperties:true},render:(_args,value)=>{
   const text=JSON.stringify(value);return [{type:'text',text:text.length<=14000?text:JSON.stringify({omitted:true,message:'結果較大；在相容修補工作台查看差異或匯出完整未驗證 JSON。',id:value.result?.id??null,artifact:value.result?.artifact??null,status:value.result?.status??null})}];
  }},
  async execute(args){return {result:await workbench.dispatch(args.action,args)};},
 };
}
