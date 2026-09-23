// Blink SDK converts SQL result keys to camelCase. The migrated domain uses
// the database column names, so restore those at this single boundary.
type SqlClient = {sql:(query:string,args?:any[])=>Promise<any>;batch:(statements:any[],mode?:'read'|'write')=>Promise<any>};
const rowsToColumns=(rows:any[]=[])=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key.replace(/[A-Z]/g,letter=>'_'+letter.toLowerCase()),value])));
export function adaptBlinkSql(client:SqlClient):SqlClient {
 return {
  async sql(query,args){const result=await client.sql(query,args);return {...result,rows:rowsToColumns(result.rows)}},
  async batch(statements,mode){const result=await client.batch(statements,mode);return {...result,results:(result.results||[]).map((item:any)=>({...item,rows:rowsToColumns(item.rows)}))}},
 }
}
