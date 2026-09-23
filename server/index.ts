import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { makeContext } from './native/context'
import { Database } from './native/database'
import { publicBooking } from './native/public-booking'
import { z } from 'zod'
import { loadDomain,rpcAllowlist,publicRoutes } from './native/domain'
const app=new Hono()
app.use('*',cors({origin:'*'}))
app.onError((e,c)=>{console.error('request failed',e.message);return c.json({error:e.message||'Falha ao processar'},400)})
app.get('/health',async c=>{const ctx=await makeContext(c.req.raw,c.env as any);await ctx.sql.sql('SELECT id FROM plan LIMIT 1');return c.json({ok:true,database:'connected',version:'barbeiropro-native-v1'})})
app.get('/api/bootstrap',async c=>{const ctx=await makeContext(c.req.raw,c.env as any),env=c.env as any;return c.json({configured:!!(env.OWNER_USER_ID||env.OWNER_EMAIL)&&env.OWNER_PROJECT_ID===env.BLINK_PROJECT_ID,isSuperAdmin:ctx.identity.master})})
app.post('/api/query',async c=>{const ctx=await makeContext(c.req.raw,c.env as any);const spec=await c.req.json();return c.json(await new Database(ctx.sql,ctx.identity).execute(spec))})
app.post('/api/public/booking',async c=>{const ctx=await makeContext(c.req.raw,c.env as any,true);return c.json(await publicBooking(ctx,await c.req.json()))})
app.post('/api/onboarding',async c=>{
 const ctx=await makeContext(c.req.raw,c.env as any)
 if(!ctx.identity.userId)return c.json({error:'Autenticação necessária'},401)
 if(ctx.identity.companyId)return c.json({id:ctx.identity.companyId})
 const data=z.object({name:z.string().trim().min(2).max(150),nome_fantasia:z.string().max(150),slug:z.string().regex(/^[a-z0-9-]{2,80}$/),whatsapp:z.string().max(30).optional(),telefone_comercial:z.string().max(30).optional(),plan_slug:z.string().max(60).default('starter')}).parse(await c.req.json())
 const {plan_slug,...companyData}=data;const plan=(await ctx.sql.sql('SELECT slug,trial_days FROM plan WHERE slug=? AND ativo=1',[plan_slug])).rows[0];if(!plan)throw new Error('Plano indisponível');
 const result=await ctx.admin.from('company').insert({...companyData,created_by:ctx.identity.userId,email_contato:ctx.identity.email,onboarding_step:1,selected_plan_slug:plan.slug,status_cobranca:'trial',trial_ate:new Date(Date.now()+Math.max(0,Number(plan.trial_days??14))*86400000).toISOString()}).select('id').single()
 if(result.error)throw new Error(result.error.message)
 return c.json(result.data)
})
app.post('/api/rpc',async c=>{
 const ctx=await makeContext(c.req.raw,c.env as any),body=await c.req.json()
 if(!ctx.identity.userId)return c.json({error:'Autenticação necessária'},401)
 if(!rpcAllowlist[body.module]?.includes(body.name))return c.json({error:'Operação inexistente'},404)
 return c.json(await loadDomain(ctx)(body.module)[body.name]({data:body.data})??null)
})
app.post('/api/database-operation',async c=>{const ctx=await makeContext(c.req.raw,c.env as any);if(!ctx.identity.userId)return c.json({error:'Autenticação necessária'},401);const body=await c.req.json();return c.json(await ctx.scoped.rpc(body.name,body.args))})
for(const [route,module]of Object.entries(publicRoutes))app.all(route,async c=>{
 const ctx=await makeContext(c.req.raw,c.env as any,true),config=loadDomain(ctx)(module).Route
 const handler=config.server?.handlers?.[c.req.method]
 if(!handler)return c.json({error:'Método não permitido'},405)
 return handler({request:c.req.raw,params:{}})
})
export default app
