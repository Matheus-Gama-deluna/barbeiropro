import { z } from 'zod'
const id=z.string().min(1).max(100)
export async function publicBooking(ctx:any,body:any){
 const {sql,admin}=ctx,op=body.op,data=body.data||{}
 if(op==='company'){
  const slug=z.string().min(1).max(100).parse(data.slug)
  const rows=(await sql.sql("SELECT id,name,nome_fantasia,logo_url,primary_color,whatsapp,endereco,business_hours FROM company WHERE slug=? AND status_cobranca NOT IN ('cancelado','suspenso') LIMIT 1",[slug])).rows
  return rows[0]?{...rows[0],endereco:JSON.parse(rows[0].endereco||'{}'),business_hours:JSON.parse(rows[0].business_hours||'{}')}:null
 }
 if(['services','professionals','get_busy_slots','book'].includes(op)){
  const cid=id.parse(data.company_id||data._company_id)
  const company=(await sql.sql("SELECT id FROM company WHERE id=? AND slug IS NOT NULL AND status_cobranca NOT IN ('cancelado','suspenso') LIMIT 1",[cid])).rows[0]
  if(!company)throw new Error('Barbearia indisponível')
  if(op==='services')return(await sql.sql('SELECT id,name,price,duration_minutes,category_id FROM service WHERE company_id=? AND active=1 ORDER BY name',[cid])).rows
  if(op==='professionals')return(await sql.sql('SELECT id,name,specialty,photo_url FROM professional WHERE company_id=? AND active=1 ORDER BY name',[cid])).rows
  if(op==='get_busy_slots'){
   const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(data._date)
   return(await sql.sql("SELECT a.scheduled_at AS starts_at,strftime('%Y-%m-%dT%H:%M:%fZ',a.scheduled_at,'+'||COALESCE(s.duration_minutes,30)||' minutes') AS ends_at FROM appointment a LEFT JOIN service s ON s.id=a.service_id WHERE a.company_id=? AND a.professional_id=? AND a.status NOT IN ('cancelado','faltou','nao_compareceu') AND substr(a.scheduled_at,1,10)=?",[cid,id.parse(data._professional_id),day])).rows
  }
  const input=z.object({service_id:id,professional_id:id,name:z.string().trim().min(2).max(120),phone:z.string().regex(/^\+?[\d ()-]{8,25}$/),scheduled_at:z.string().datetime()}).parse(data)
  if(new Date(input.scheduled_at).getTime()<Date.now()-60000)throw new Error('Escolha um horário futuro')
  const svc=(await sql.sql('SELECT * FROM service WHERE id=? AND company_id=? AND active=1',[input.service_id,cid])).rows[0]
  const pro=(await sql.sql('SELECT * FROM professional WHERE id=? AND company_id=? AND active=1',[input.professional_id,cid])).rows[0]
  if(!svc||!pro)throw new Error('Serviço ou profissional indisponível')
  const phone=input.phone.replace(/\D/g,'')
  let customer=(await sql.sql('SELECT id FROM customer WHERE company_id=? AND phone=? LIMIT 1',[cid,phone])).rows[0]
  const apptId=crypto.randomUUID(),customerId=customer?.id||crypto.randomUUID()
  const statements:any[]=[]
  if(!customer)statements.push({sql:'INSERT INTO customer(id,company_id,name,phone) VALUES(?,?,?,?)',args:[customerId,cid,input.name,phone]})
  statements.push({sql:"INSERT INTO appointment(id,company_id,customer_id,professional_id,service_id,customer_name,customer_phone,professional_name,service_name,price,scheduled_at,source,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'online','agendado')",args:[apptId,cid,customerId,pro.id,svc.id,input.name,phone,pro.name,svc.name,svc.price,input.scheduled_at]})
  await sql.batch(statements,'write')
  return{id:apptId}
 }
 if(['get_appointment_by_token','confirm_appointment_by_token','cancel_appointment_by_token'].includes(op)){
  const token=z.string().regex(/^[a-f0-9]{32,64}$/).parse(data._token)
  if(op==='get_appointment_by_token')return(await sql.sql("SELECT a.id,a.scheduled_at,a.status,a.confirmed_at,a.service_name,a.professional_name,a.customer_name,c.id AS company_id,COALESCE(c.nome_fantasia,c.name) AS company_nome,c.primary_color AS company_primary_color,c.telefone_comercial AS company_telefone,c.endereco AS company_endereco FROM appointment a JOIN company c ON c.id=a.company_id WHERE a.confirm_token=? LIMIT 1",[token])).rows
  const rows=(await sql.sql("UPDATE appointment SET status=?,confirmed_at=? WHERE confirm_token=? AND status IN ('agendado','confirmado') RETURNING id",[op==='cancel_appointment_by_token'?'cancelado':'confirmado',new Date().toISOString(),token])).rows
  return rows.length>0
 }
 throw new Error('Operação pública inválida')
}
