export function checkCompatHttp(req){
 const type=String(req.headers?.['content-type']??'').split(';')[0].trim().toLowerCase();
 if(type!=='application/json')throw new Error('相容修補請求必須使用 application/json。');
 if(!/^(?:127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|::1|::ffff:127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/i.test(req.socket?.remoteAddress??''))throw new Error('相容修補 HTTP 入口只接受本機連線。');
 const site=req.headers?.['sec-fetch-site'];
 if(site&&site!=='same-origin'&&site!=='none')throw new Error('拒絕跨來源相容修補請求。');
 let authority;try{authority=new URL(`http://${req.headers?.host??''}`);}catch{throw new Error('無效的工作台位址。');}
 if(authority.username||authority.password||!['localhost','127.0.0.1','[::1]'].includes(authority.hostname))throw new Error('此工作台 HTTP 入口僅支援本機 GUI；遠端請使用 Agent 工具。');
 const origin=req.headers?.origin;
 if(origin){let url;try{url=new URL(origin);}catch{throw new Error('無效的請求來源。');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.host!==req.headers.host)throw new Error('拒絕跨來源相容修補請求。');
 }
}
