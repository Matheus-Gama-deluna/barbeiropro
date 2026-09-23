import { ensureDatabase } from './bootstrap'
import { adaptBlinkSql } from './sql-adapter'
import { ownerEligible } from './owner'
import { createClient } from '@blinkdotnew/sdk'
import { Database,type Identity } from './database'
export async function makeContext(request:Request,env:Record<string,string>,publicWebhook=false){
 const blink=createClient({projectId:env.BLINK_PROJECT_ID,secretKey:env.BLINK_SECRET_KEY,auth:{mode:'headless'}})
 const sql=adaptBlinkSql(blink.db)
 await ensureDatabase(sql,env.BLINK_PROJECT_ID)
 const header=publicWebhook?null:request.headers.get('authorization')
 const auth=header?await blink.auth.verifyToken(header):{valid:false}
 if(header&&(!auth.valid||!('userId'in auth)||!auth.userId||auth.projectId!==env.BLINK_PROJECT_ID))throw new Error('Sessão inválida')
 const userId=auth.valid&&'userId'in auth?auth.userId||'':''
 const email=auth.valid&&'email'in auth?String(auth.email||'').toLowerCase():''
 if(userId){
  await sql.sql('INSERT INTO profiles(user_id,email) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email',[userId,email])
  if(await ownerEligible({userId,email},env,sql))await sql.batch([
   {sql:'INSERT INTO template_owner(id,user_id) VALUES(?,?) ON CONFLICT(id) DO NOTHING',args:['owner',userId]},
   {sql:"INSERT INTO user_roles(id,user_id,role) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM template_owner WHERE id='owner' AND user_id=?) ON CONFLICT(user_id,role) DO NOTHING",args:['owner:'+userId,userId,'super_admin',userId]},
  ],'write')
  const verified=(await sql.sql('SELECT email,email_verified FROM users WHERE id=?',[userId])).rows[0]
  if(Number(verified?.email_verified)===1&&String(verified.email).toLowerCase()===email)
   await sql.sql('UPDATE company_user SET user_id=?,convite_aceito=1 WHERE LOWER(email)=? AND user_id IS NULL',[userId,email])
 }
 const member=userId?(await sql.sql('SELECT company_id,role FROM company_user WHERE user_id=? AND ativo=1 ORDER BY created_at LIMIT 1',[userId])).rows[0]:null
 const master=userId?!!(await sql.sql("SELECT 1 FROM user_roles WHERE user_id=? AND role='super_admin' LIMIT 1",[userId])).rows.length:false
 const identity:Identity={userId,email,master,companyId:member?.company_id,role:member?.role}
 const admin=new Database(sql,identity,true,true),scoped=new Database(sql,identity,false,true)
 admin.auth={admin:{
  async createUser(){return{data:{user:null},error:{message:'Use Entrar com minha conta Blink para criar e verificar a conta.'}}},
  async updateUserById(){return{error:{message:'O titular gerencia sua senha na tela de acesso Blink.'}}},
  async listUsers({page=1,perPage=200}:any){const rows=(await sql.sql('SELECT user_id,email FROM profiles ORDER BY user_id LIMIT ? OFFSET ?',[perPage,(page-1)*perPage])).rows;return{data:{users:rows.map((r:any)=>({id:r.user_id,email:r.email}))},error:null}},
  async getUserById(id:string){const row=(await sql.sql('SELECT user_id,email FROM profiles WHERE user_id=?',[id])).rows[0];return{data:{user:row?{id:row.user_id,email:row.email}:null},error:null}},
 }}
 for(const db of [admin,scoped])db.rpc=async(name:string,args:any={})=>{try{
  const cid=args._company_id
  if(name==='is_super_admin')return{data:identity.master,error:null}
  if(name==='has_company_role'){const row=(await sql.sql('SELECT role FROM company_user WHERE company_id=? AND user_id=? AND ativo=1',[cid,userId])).rows[0];return{data:identity.master||!!row&&Array.isArray(args._roles)&&args._roles.includes(row.role),error:null}}
  if(name==='close_sale'){
   const sale=(await sql.sql('SELECT * FROM sale WHERE id=?',[args._sale_id])).rows[0]
   if(!sale||(!master&&(sale.company_id!==identity.companyId||!['owner','admin','recepcao','financeiro'].includes(identity.role||''))))throw new Error('Sem acesso a esta comanda')
   if(sale.status==='cancelada')throw new Error('Comanda cancelada')
   const discount=args._desconto_cents==null?Number(sale.desconto_cents||0):Number(args._desconto_cents)
   if(!Number.isInteger(discount)||discount<0)throw new Error('Desconto inválido')
   await sql.sql("UPDATE sale SET status='fechada',desconto_cents=?,forma_pagamento=COALESCE(?,forma_pagamento) WHERE id=? AND status='aberta'",[discount,args._forma_pagamento||null,sale.id])
   return{data:(await sql.sql('SELECT * FROM sale WHERE id=?',[sale.id])).rows[0],error:null}
  }
  if(db.internal&&name==='trial_identity_conflict'){const row=(await sql.sql('SELECT email,cpf,phone FROM trial_identity WHERE email=? OR cpf=? OR phone=? LIMIT 1',[args._email,args._cpf,args._phone])).rows[0];return{data:row?(row.email===args._email?'email':row.cpf===args._cpf?'cpf':'phone'):null,error:null}}
  throw new Error('Operação não disponível: '+name)
 }catch(error:any){return{data:null,error:{message:error.message}}}}
 return{blink,sql,identity,admin,scoped,request,env}
}
