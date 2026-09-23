import { blink } from './client'
const projectId=import.meta.env.VITE_BLINK_PROJECT_ID
const expectedHost=projectId?projectId.slice(-8)+'.backend.blink.new':''
const configuredUrl=String(import.meta.env.VITE_BLINK_BACKEND_URL||'').replace(/\/$/,'')
export const backendUrl=configuredUrl|| (expectedHost?'https://'+expectedHost:'')
export async function callBackend(path:string,body?:any){
 if(!projectId||!backendUrl||new URL(backendUrl).hostname!==expectedHost)throw new Error('Inicialize o backend desta cópia usando o prompt de instalação. O endereço deve pertencer ao projeto atual.')
 if(typeof window!=='undefined' && /\.(blinkusercontent\.com|blinkpowered\.com)$/.test(window.location.hostname) && window.location.hostname.split('.')[0]!==projectId)throw new Error('Finalize a instalação desta cópia pelo comando do guia antes de entrar.');
 await blink.auth.initialize()
 const token=await blink.auth.getValidToken()
 const response=await fetch(backendUrl+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const result=await response.json().catch(()=>({error:'Resposta inválida do servidor'}))
 if(!response.ok)throw new Error(typeof result.error==='string'?result.error:result.error?.message||'Falha no servidor')
 return result
}
