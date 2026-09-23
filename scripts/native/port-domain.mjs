import fs from 'node:fs';import path from 'node:path';import ts from 'typescript'
const root=process.cwd(),source=path.join(root,'_migration/native-domain')
fs.mkdirSync(source,{recursive:true})
if(!fs.existsSync(path.join(source,'src')))fs.cpSync(path.join(root,'src'),path.join(source,'src'),{recursive:true})
const special=new Set(['@tanstack/react-start','@tanstack/react-start/server','@/integrations/supabase/auth-middleware','@/integrations/supabase/client.server','@/integrations/supabase/client','@/blink/client','node:process','@tanstack/react-router'])
const files=new Map(),external=new Map(),rpc={},publicRoutes={}
function resolve(id,from){if(special.has(id))return id;if(id.startsWith('@/'))return id.replace('@/', 'src/');if(id.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(from),id));return id}
function load(id){if(special.has(id)||files.has(id))return;if(!id.startsWith('src/')){if(!external.has(id))external.set(id,'external'+external.size);return}
 const file=[id+'.ts',id+'.tsx',id].map(x=>path.join(source,x)).find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());if(!file)throw new Error('Missing '+id)
 const text=fs.readFileSync(file,'utf8'),compiled=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
 files.set(id,'');let code=compiled.replace(/require\(["']([^"']+)["']\)/g,(_,dep)=>{const r=resolve(dep,id);load(r);return 'require('+JSON.stringify(r)+')'})
 files.set(id,code)
 if(id.endsWith('.functions'))rpc[id]=[...text.matchAll(/export const (\w+)\s*=\s*createServerFn/g)].map(m=>m[1])
}
for(const file of fs.readdirSync(path.join(source,'src/lib')))if(file.endsWith('.functions.ts'))load('src/lib/'+file.slice(0,-3))
for(const file of fs.readdirSync(path.join(source,'src/routes/api'),{recursive:true}))if(file.endsWith('.ts')){const id='src/routes/api/'+file.slice(0,-3);load(id);const text=fs.readFileSync(path.join(source,id+'.ts'),'utf8');const route=text.match(/createFileRoute\("([^"]+)"\)/)?.[1];if(route)publicRoutes[route]=id}
const imports=[...external].map(([k,v])=>'import * as '+v+' from '+JSON.stringify(k)).join('\n')
const factories=[...files].map(([id,code])=>JSON.stringify(id)+': (module:any,exports:any,require:any,process:any)=>{\n'+code+'\n}').join(',\n')
fs.writeFileSync('server/native/domain.ts',`// Generated from preserved source by scripts/native/port-domain.mjs. No runtime eval.\n${imports}\nexport const publicRoutes=${JSON.stringify(publicRoutes)} as Record<string,string>\nexport const rpcAllowlist=${JSON.stringify(rpc)} as Record<string,string[]>\nconst factories:Record<string,Function>={${factories}}\nexport function loadDomain(ctx:any){
 const cache:Record<string,any>={}
 const external:Record<string,any>={${[...external].map(([k,v])=>JSON.stringify(k)+':'+v).join(',')}}
 function createServerFn(){let validate=(x:any)=>x,needsAuth=false;const builder:any={middleware(){needsAuth=true;return builder},inputValidator(fn:any){validate=fn;return builder},handler(fn:any){return async(args:any={})=>{if(needsAuth&&!ctx.identity.userId)throw new Error('Autenticação necessária');return fn({context:{supabase:ctx.scoped,userId:ctx.identity.userId,claims:ctx.identity},data:validate(args.data),request:ctx.request})}}};return builder}
 const special:Record<string,any>={'@tanstack/react-router':{createFileRoute:()=> (config:any)=>config},'@tanstack/react-start':{createServerFn},'@tanstack/react-start/server':{getRequest:()=>ctx.request},'@/integrations/supabase/auth-middleware':{requireSupabaseAuth:{}},'@/integrations/supabase/client.server':{supabaseAdmin:ctx.admin},'@/integrations/supabase/client':{supabase:ctx.scoped},'@/blink/client':{blink:ctx.blink},'node:process':{env:ctx.env}}
 function load(id:string):any{if(special[id])return special[id];if(external[id])return external[id];if(cache[id])return cache[id].exports;if(!factories[id])throw new Error('Módulo indisponível');const module={exports:{}};cache[id]=module;factories[id](module,module.exports,load,{env:ctx.env});return module.exports}
 return load
}
`)
for(const [id,names]of Object.entries(rpc))fs.writeFileSync(id+'.ts',`import { callBackend } from '@/blink/backend'\n`+names.map(n=>`export const ${n} = (args:any={}) => callBackend('/api/rpc', {module:${JSON.stringify(id)}, name:${JSON.stringify(n)},data:args.data})`).join('\n')+'\n')
console.log('Ported',Object.values(rpc).flat().length,'functions;',files.size,'domain modules; external:',[...external.keys()].join(', '))
