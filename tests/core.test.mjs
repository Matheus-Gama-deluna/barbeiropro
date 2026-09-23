import assert from 'node:assert/strict'
import {test,beforeEach} from 'node:test'
import {DatabaseSync} from 'node:sqlite'
import fs from 'node:fs'
import {Database} from './database.bundle.mjs'
import {publicBooking} from './public.bundle.mjs'
let db,sql,a,b,admin
beforeEach(()=>{
 db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('scripts/native/schema.sql','utf8'));db.exec(fs.readFileSync('scripts/native/bootstrap.sql','utf8'))
 sql={async sql(q,args=[]){return{rows:db.prepare(q).all(...args)}},async batch(items){db.exec('BEGIN');try{const results=items.map(x=>({rows:db.prepare(x.sql).all(...x.args||[])}));db.exec('COMMIT');return{results}}catch(e){db.exec('ROLLBACK');throw e}}}
 db.exec("INSERT INTO profiles(user_id,email) VALUES('u1','a@example.test'),('u2','b@example.test'); INSERT INTO company(id,name,slug,created_by,fidelidade_ativa) VALUES('a','A','barber-a','u1',1),('b','B','barber-b','u2',0); INSERT INTO customer(id,company_id,name,phone) VALUES('ca','a','Alpha','111'),('cb','b','Beta','222'); INSERT INTO service(id,company_id,name,price,duration_minutes) VALUES('sa','a','Corte',50,40),('sb','b','Corte B',70,30); INSERT INTO professional(id,company_id,name,comissao_percentual) VALUES('pa','a','Profissional A',30),('pb','b','Profissional B',50);")
 a=new Database(sql,{userId:'u1',companyId:'a',role:'owner',master:false});b=new Database(sql,{userId:'u2',companyId:'b',role:'owner',master:false});admin=new Database(sql,{userId:'root',master:true},true,true)
})
test('company isolation for reads, changes and deletion',async()=>{
 assert.deepEqual((await a.from('customer').select('id')).data,[{id:'ca'}]);await a.from('customer').update({name:'X'}).eq('id','cb');await a.from('customer').delete().eq('id','cb');assert.equal((await b.from('customer').select('name').single()).data.name,'Beta')
})
test('tenant cannot grant itself master or change billing or global plans',async()=>{
 for(const q of [a.from('user_roles').insert({user_id:'u1',role:'super_admin'}),a.from('company').update({status_cobranca:'ativo'}).eq('id','a'),a.from('plan').update({preco_cents:0}).eq('id','pro')])assert.ok((await q).error)
})
test('CRUD persists, decodes flags and joins actual foreign-key aliases',async()=>{
 const p=await a.from('customer').insert({name:'Novo',phone:'333'}).select('*').single();assert.equal(p.error,null);assert.equal((await a.from('customer').eq('id',p.data.id).single()).data.name,'Novo');
 const sale=await a.from('sale').insert({customer_id:p.data.id,professional_id:'pa'}).select('*,customer:customer_id(name),professional:professional_id(name)').single();assert.equal(sale.error,null);assert.equal(sale.data.customer.name,'Novo');assert.equal(sale.data.professional.name,'Profissional A');assert.equal((await a.from('professional').eq('id','pa').single()).data.active,true)
})
test('cannot point own appointment or service assignment at foreign company',async()=>{
 assert.ok((await a.from('appointment').insert({professional_id:'pb',service_id:'sa',scheduled_at:'2030-01-01T10:00:00Z'})).error)
 assert.ok((await a.from('professional_service').upsert({professional_id:'pa',service_id:'sb'},{onConflict:'professional_id,service_id'})).error)
 const ok=await a.from('professional_service').upsert({professional_id:'pa',service_id:'sa',comissao_percentual:25},{onConflict:'professional_id,service_id'});assert.equal(ok.error,null)
})
test('anonymous requests cannot read customers, membership, or billing settings',async()=>{
 const anon=new Database(sql,{userId:'',master:false});for(const table of ['customer','company_user','app_config','appointment'])assert.ok((await anon.from(table).select('*')).error)
})
test('public booking uses server prices, exposes only public fields and stops conflicts',async()=>{
 const ctx={sql,admin};const c=await publicBooking(ctx,{op:'company',data:{slug:'barber-a'}});assert.equal(c.id,'a');assert.equal(c.created_by,undefined);assert.equal(c.email_contato,undefined)
 const input={company_id:'a',service_id:'sa',professional_id:'pa',name:'Teste Agenda',phone:'51999990000',scheduled_at:'2030-01-01T10:00:00.000Z',price:0};
 const appt=await publicBooking(ctx,{op:'book',data:input});assert.equal(db.prepare('SELECT price FROM appointment WHERE id=?').get(appt.id).price,50)
 await assert.rejects(publicBooking(ctx,{op:'book',data:{...input,scheduled_at:'2030-01-01T10:30:00.000Z'}}),/reservado/)
 const busy=await publicBooking(ctx,{op:'get_busy_slots',data:{_company_id:'a',_professional_id:'pa',_date:'2030-01-01'}});assert.equal(busy.length,1);assert.equal(busy[0].customer_name,undefined)
 await assert.rejects(publicBooking(ctx,{op:'book',data:{...input,professional_id:'pb'}}),/indisponível/)
})
test('booking confirmation and cancellation require unpredictable valid tokens',async()=>{
 await publicBooking({sql,admin},{op:'book',data:{company_id:'a',service_id:'sa',professional_id:'pa',name:'Teste Agenda',phone:'51999990000',scheduled_at:'2030-01-01T10:00:00.000Z'}})
 const token=db.prepare('SELECT confirm_token FROM appointment').get().confirm_token;assert.equal(token.length,48)
 assert.equal(await publicBooking({sql,admin},{op:'confirm_appointment_by_token',data:{_token:token}}),true)
 assert.equal(db.prepare('SELECT status FROM appointment').get().status,'confirmado')
 assert.equal(await publicBooking({sql,admin},{op:'cancel_appointment_by_token',data:{_token:token}}),true)
})
test('closing a sale atomically updates commissions, stock, finance and loyalty exactly once',async()=>{
 db.exec("INSERT INTO product(id,company_id,nome,estoque,preco_cents) VALUES('prod','a','Pomada',10,2000); INSERT INTO sale(id,company_id,customer_id,desconto_cents) VALUES('sale','a','ca',500); INSERT INTO sale_item(company_id,sale_id,tipo,ref_id,professional_id,preco_cents,quantidade) VALUES('a','sale','servico','sa','pa',5000,1),('a','sale','produto','prod','pa',2000,2); UPDATE sale SET status='fechada' WHERE id='sale';")
 assert.equal(db.prepare("SELECT total_cents FROM sale WHERE id='sale'").get().total_cents,8500)
 assert.equal(db.prepare("SELECT estoque FROM product WHERE id='prod'").get().estoque,8)
 assert.equal(db.prepare("SELECT amount FROM financial_entry WHERE id='sale:sale'").get().amount,85)
 assert.equal(db.prepare("SELECT fidelidade_contador FROM customer WHERE id='ca'").get().fidelidade_contador,1)
 assert.equal(db.prepare("SELECT SUM(comissao_cents) AS n FROM sale_item WHERE sale_id='sale'").get().n,2700)
 db.exec("UPDATE sale SET status='fechada' WHERE id='sale'");assert.equal(db.prepare("SELECT estoque FROM product WHERE id='prod'").get().estoque,8)
 assert.throws(()=>db.exec("UPDATE sale_item SET quantidade=7 WHERE sale_id='sale'"),/encerrada/)
})
test('schema and initialization are safe to reapply without duplicating plans',()=>{
 db.exec(fs.readFileSync('scripts/native/schema.sql','utf8'));db.exec(fs.readFileSync('scripts/native/bootstrap.sql','utf8'));assert.equal(db.prepare('SELECT count(*) AS n FROM plan').get().n,3)
})
test('sale items cannot reference products or services from another company',async()=>{
 db.exec("INSERT INTO sale(id,company_id) VALUES('own-sale','a'); INSERT INTO product(id,company_id,nome,preco_cents) VALUES('foreign','b','Outro',1000)")
 for(const [tipo,ref_id]of [['produto','foreign'],['servico','sb']])assert.ok((await a.from('sale_item').insert({sale_id:'own-sale',tipo,ref_id,preco_cents:1000,quantidade:1})).error)
 const item=await a.from('sale_item').insert({sale_id:'own-sale',tipo:'servico',ref_id:'sa',preco_cents:5000,quantidade:1}).select('*').single();assert.equal(item.error,null)
 assert.ok((await a.from('sale_item').update({ref_id:'sb'}).eq('id',item.data.id)).error)
})
