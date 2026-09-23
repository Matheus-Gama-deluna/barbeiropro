import { Query } from '../../../shared/query'
import { callBackend } from '@/blink/backend'
export function createBlinkDataClient(_client?:unknown){return{
 from(table:string){return new Query(table,async spec=>{try{return await callBackend('/api/query',spec)}catch(error:any){return{data:null,error:{message:error.message},count:0}}})},
 rpc(name:string,args:any){return callBackend('/api/database-operation',{name,args})},
 auth:undefined as any,
}}
