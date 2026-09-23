import { Query, type QuerySpec } from '../../shared/query'
import { schema } from './schema'
export type Identity = { userId:string; email?:string; master:boolean; companyId?:string; role?:string }
type SQL = {sql:(q:string,args?:any[])=>Promise<{rows:any[]}>;batch:(s:{sql:string,args?:any[]}[],mode?:'read'|'write')=>Promise<any>}
const jsonFields=new Set(["beneficios", "business_hours", "endereco", "features", "metadata", "payload", "provider_price_ids", "super_admin_emails", "system_settings", "tags", "work_schedule"])
const adminTables=new Set(['app_config','billing_event_log','trial_identity'])
const secretFields=new Set(['openai_api_key','anthropic_api_key','access_token','refresh_token','webhook_token','convite_token'])
const readOnly=new Set(['company_user','user_roles','subscription','billing_event_log','invoice_simulated'])
const attendantWrites=new Set(['appointment','customer','sale','sale_item'])
const quote=(s:string)=>'"'+s+'"'
const value=(v:any)=>typeof v==='boolean'?Number(v):v!==null&&typeof v==='object'?JSON.stringify(v):v??null
function column(table:string,key:string){if(!schema[table]?.[key])throw new Error('Coluna inválida: '+key);return quote(key)}
function parts(input:string){let depth=0,start=0;const out:string[]=[];for(let i=0;i<input.length;i++){if(input[i]==='(')depth++;if(input[i]===')')depth--;if(depth<0)throw new Error('Seleção inválida');if(input[i]===','&&depth===0){out.push(input.slice(start,i).trim());start=i+1}}if(depth!==0)throw new Error('Seleção inválida');out.push(input.slice(start).trim());return out}
function decode(table:string,row:any){return Object.fromEntries(Object.entries(row).map(([k,v])=>{if(schema[table]?.[k]==='BOOLEAN')return[k,v===true||v===1||v==='1'||v==='true'];if(v!==null&&v!==''&&['INTEGER','REAL','NUMERIC'].includes(schema[table]?.[k])&&Number.isFinite(Number(v)))return[k,Number(v)];if(jsonFields.has(k)&&typeof v==='string'){try{return[k,JSON.parse(v)]}catch{}}return[k,v]}))}
export class Database {
  auth:any
  rpc:any
  constructor(public sql:SQL,public identity:Identity,public internal=false,public trusted=false){}
  from(table:string){return new Query(table,s=>this.execute(s))}
  async scope(table:string,write:boolean):Promise<{clause:string,args:any[]}>{
    if(!schema[table])throw new Error('Tabela indisponível')
    const u=this.identity
    if(this.internal||u.master)return{clause:'1=1',args:[]}
    if(table==='plan'){if(write)throw new Error('Acesso restrito');return{clause:'ativo=1',args:[]}}
    if(!u.userId)throw new Error('Autenticação necessária')
    if(adminTables.has(table))throw new Error('Acesso restrito')
    if(write&&readOnly.has(table)&&!this.trusted)throw new Error('Use a operação autorizada para esta alteração')
    if(table==='profiles')return{clause:'user_id = ?',args:[u.userId]}
    if(table==='user_roles')return{clause:'user_id = ?',args:[u.userId]}
    if(table==='company_user'&&!u.companyId)return{clause:'user_id = ?',args:[u.userId]}
    if(!u.companyId)throw new Error('Empresa não encontrada')
    if(write&&!['owner','admin'].includes(u.role||'')&&!attendantWrites.has(table)&&!(u.role==='financeiro'&&table==='financial_entry'))throw new Error('Permissão insuficiente')
    if(['api_token','webhook_endpoint','webhook_delivery_log','google_integration'].includes(table)&&!['owner','admin'].includes(u.role||''))throw new Error('Acesso restrito')
    if(table==='professional_service')return{clause:'professional_id IN (SELECT id FROM professional WHERE company_id=?)',args:[u.companyId]};
    return{clause:(table==='company'?'id':'company_id')+' = ?',args:[u.companyId]}
  }
  async project(table:string,rows:any[],selection:string,depth=0):Promise<any[]>{
    if(depth>2)throw new Error('Relacionamento muito profundo')
    const fields=parts(selection),all=fields.includes('*');const result=[]
    for(const raw of rows){const row=decode(table,raw),out:any={};
      if(all)for(const [k,v]of Object.entries(row))if(this.internal||!secretFields.has(k))out[k]=v
      for(const field of fields){if(field==='*')continue
        const match=/^(\w+)(?::(\w+))?\((.*)\)$/.exec(field)
        if(match){const alias=match[1],target=alias==='profiles'?'profiles':(match[2]||alias).replace(/_id$/,'')
          if(!['company','plan','profiles','customer','service','professional','service_category','club_plan','sale','appointment'].includes(target))throw new Error('Relacionamento inválido')
          const fk=match[2]?.endsWith('_id')?match[2]:target==='profiles'?'user_id':target+'_id',pk=target==='profiles'?'user_id':'id'
          if(raw[fk]==null){out[alias]=null;continue}
          // Related rows come only from an already-authorized parent. Profiles expose identity, never credentials.
          const related=(await this.sql.sql('SELECT * FROM '+quote(target)+' WHERE '+quote(pk)+' = ? LIMIT 1',[raw[fk]])).rows
          if(target==='profiles'&&!this.internal){out[alias]=related[0]?Object.fromEntries(['user_id','nome','email'].filter(k=>match[3]==='*'||parts(match[3]).includes(k)).map(k=>[k,related[0][k]])):null}
          else out[alias]=(await this.project(target,related,match[3],depth+1))[0]??null
        }else{column(table,field);if(!this.internal&&secretFields.has(field))throw new Error('Campo protegido');out[field]=row[field]}
      }result.push(out)
    }return result
  }
  async execute(input:QuerySpec):Promise<any>{try{
    const s=structuredClone(input),table=s.table,write=s.action!=='select'
    if(!['select','insert','upsert','update','delete'].includes(s.action))throw new Error('Operação inválida')
    const scope=await this.scope(table,write),args=[...scope.args],conditions=[scope.clause]
    if(!Array.isArray(s.filters)||s.filters.length>30)throw new Error('Filtros inválidos')
    for(const f of s.filters){const key=column(table,f.key)
      if(f.op==='in'){if(!Array.isArray(f.value)||f.value.length>1000)throw new Error('Filtro inválido');conditions.push(f.value.length?key+' IN ('+f.value.map(()=>'?').join(',')+')':'0=1');args.push(...f.value.map(value));continue}
      if(f.op==='notnull'){conditions.push(key+' IS NOT NULL');continue}
      const op:Record<string,string>={eq:'=',neq:'!=',gt:'>',gte:'>=',lt:'<',lte:'<=',is:'IS',ilike:'LIKE'}
      if(!op[f.op])throw new Error('Operador inválido')
      conditions.push(key+' '+op[f.op]+' ?'+(f.op==='ilike'?' COLLATE NOCASE':''));args.push(value(f.value))
    }
    const where=conditions.join(' AND '),limit=Math.min(5000,Math.max(0,Number(s.limit??1000))),offset=Math.max(0,Number(s.offset??0))
    if(!Number.isInteger(limit)||!Number.isInteger(offset))throw new Error('Paginação inválida')
    const order=s.orders?.length?' ORDER BY '+s.orders.map(o=>column(table,o.key)+(o.ascending?' ASC':' DESC')).join(','):''
    let rows:any[]=[],count=0
    if(!write){count=Number((await this.sql.sql('SELECT COUNT(*) AS total FROM '+quote(table)+' WHERE '+where,args)).rows[0]?.total||0)
      if(!s.head)rows=(await this.sql.sql('SELECT * FROM '+quote(table)+' WHERE '+where+order+' LIMIT ? OFFSET ?',[...args,limit,offset])).rows
    }else{
      if(!['insert','upsert'].includes(s.action)&&s.filters.length===0)throw new Error('Alteração exige filtro explícito')
      if(s.action==='delete'){rows=(await this.sql.sql('DELETE FROM '+quote(table)+' WHERE '+where+' RETURNING *',args)).rows}
      else{
        const payloads=Array.isArray(s.payload)?s.payload:[s.payload];if(payloads.length>1000)throw new Error('Lote muito grande')
        for(const raw of payloads){if(!raw||typeof raw!=='object')throw new Error('Dados inválidos');const row={...raw}
          
          if(table==='professional'||table==='professional_service'){
            if(row.commission_type!==undefined&&!['fixed','percent'].includes(row.commission_type))throw new Error('Tipo de comissão inválido');
            for(const key of ['commission_value','comissao_percentual'])if(row[key]!=null&&(!Number.isFinite(Number(row[key]))||Number(row[key])<0||(key==='comissao_percentual'||row.commission_type==='percent')&&Number(row[key])>100))throw new Error('Valor de comissão inválido');
          }
          if(!this.internal&&!this.identity.master){
            for(const k of Object.keys(row))if(secretFields.has(k)||['status_cobranca','trial_ate','selected_plan_slug','plano','valor_mensal','ciclo'].includes(k))throw new Error('Campo protegido: '+k)
            if(table==='profiles'){if(row.created_by&&row.created_by!==this.identity.userId)throw new Error('Autor inválido');
            if(row.user_id&&row.user_id!==this.identity.userId)throw new Error('Usuário inválido');row.user_id=this.identity.userId}
            else if(table!=='company'&&table!=='professional_service'){if(row.company_id&&row.company_id!==this.identity.companyId)throw new Error('Empresa inválida');row.company_id=this.identity.companyId}
            if(row.created_by&&row.created_by!==this.identity.userId)throw new Error('Autor inválido');
            if(row.user_id&&row.user_id!==this.identity.userId)throw new Error('Usuário inválido')
            if(s.action==='update')delete row.id
            for(const [fk,target]of [['category_id','service_category'],['service_id','service'],['professional_id','professional'],['customer_id','customer'],['sale_id','sale'],['club_plan_id','club_plan'],['appointment_id','appointment'],['reference_appointment_id','appointment']])if(row[fk]){const r=await this.sql.sql('SELECT id FROM '+target+' WHERE id = ? AND company_id = ?',[row[fk],this.identity.companyId]);if(!r.rows.length)throw new Error('Referência de outra empresa')}
            if(table==='sale_item'&&(row.ref_id!==undefined||row.tipo!==undefined)){
              const existing=s.action==='update'?(await this.sql.sql('SELECT ref_id,tipo FROM sale_item WHERE '+where,args)).rows:[];
              const candidates=existing.length?existing.map((x:any)=>({...x,...row})):[row];
              for(const item of candidates){const target=item.tipo==='produto'?'product':item.tipo==='servico'?'service':null;if(!target||!item.ref_id)throw new Error('Item inválido');const found=await this.sql.sql('SELECT id FROM '+target+' WHERE id=? AND company_id=?',[item.ref_id,this.identity.companyId]);if(!found.rows.length)throw new Error('Referência de outra empresa')}
            }
            if(s.action==='insert'&&row.id){const existing=await this.sql.sql('SELECT id FROM '+quote(table)+' WHERE id = ?',[row.id]);if(existing.rows.length)throw new Error('Registro já existe')}
          }
          if(s.action!=='update'&&schema[table].id&&!row.id)row.id=crypto.randomUUID()
          if(s.action==='update'&&schema[table].updated_at)row.updated_at=new Date().toISOString()
          const keys=Object.keys(row);keys.forEach(k=>column(table,k));if(!keys.length)throw new Error('Dados vazios')
          let statement:string,params:any[]
          if(s.action==='update'){statement='UPDATE '+quote(table)+' SET '+keys.map(k=>quote(k)+' = ?').join(',')+' WHERE '+where+' RETURNING *';params=[...keys.map(k=>value(row[k])),...args]}
          else{statement='INSERT INTO '+quote(table)+' ('+keys.map(quote).join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')';params=keys.map(k=>value(row[k]))
            if(s.action==='upsert'){const conflict=(s.conflict|| (schema[table].id?'id':table==='profiles'?'user_id':'company_id')).split(',').map(k=>k.trim());conflict.forEach(k=>column(table,k));const updates=keys.filter(k=>!conflict.includes(k)&&k!=='id');
              if(!this.internal&&!this.identity.master&&table!=='profiles'&&table!=='professional_service'&&!conflict.includes('company_id'))throw new Error('Upsert exige chave da empresa')
              statement+=' ON CONFLICT ('+conflict.map(quote).join(',')+') '+(updates.length?'DO UPDATE SET '+updates.map(k=>quote(k)+'=excluded.'+quote(k)).join(','):'DO NOTHING')
            }statement+=' RETURNING *'}
          rows.push(...(await this.sql.sql(statement,params)).rows)
        }
      }count=rows.length
    }
    const projected=await this.project(table,rows,s.columns||'*')
    if(s.cardinality==='one'&&projected.length!==1)throw new Error('Esperado exatamente um registro')
    if(s.cardinality==='maybe'&&projected.length>1)throw new Error('Mais de um registro encontrado')
    return{data:s.head?null:s.cardinality?(projected[0]??null):projected,error:null,count}
  }catch(error:any){return{data:null,error:{message:error.message||String(error)},count:0}}}
}
