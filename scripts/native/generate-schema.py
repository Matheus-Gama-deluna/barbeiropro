import json,re,pathlib
r=pathlib.Path(__file__).resolve().parents[2]
m=json.loads((r/'schema-meta.json').read_text()); schema=m['schema']
def default(t,k):
 d=m['defaults'].get(t,{}).get(k,'').split(' CHECK ')[0]
 if k=='id':return "(lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))))"
 if k=='confirm_token':return "(lower(hex(randomblob(24))))"
 if k in ['created_at','updated_at','started_at']:return "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
 if k=='trial_ate':return "(date('now','+14 days'))"
 if 'ARRAY[' in d or '::text[]' in d:return "'[]'"
 if d=='true':return '1'
 if d=='false':return '0'
 if d.startswith("'"):return re.match(r"'(?:[^']|'')*'",d)[0]
 if re.fullmatch(r'-?\d+(\.\d+)?',d):return d
 return None
sql=[]
for t,cols in schema.items():
 lines=[]
 for k,typ in cols.items():
  d=default(t,k);line='"'+k+'" '+typ
  if k=='id' or (t=='profiles' and k=='user_id'):line+=' PRIMARY KEY'
  if d is not None:line+=' DEFAULT '+d
  lines.append(line)
 sql.append('CREATE TABLE IF NOT EXISTS "'+t+'" (\n  '+',\n  '.join(lines)+'\n);')
 for k in ['company_id','user_id']:
  if k in cols:sql.append(f'CREATE INDEX IF NOT EXISTS idx_{t}_{k} ON "{t}"("{k}");')
for table,cols in [('company','slug'),('plan','slug'),('user_roles','user_id,role'),('company_user','company_id,email'),('professional_service','professional_id,service_id'),('subscription','company_id'),('appointment','confirm_token')]:
 sql.append(f'CREATE UNIQUE INDEX IF NOT EXISTS uniq_{table}_{cols.replace(",","_")} ON {table}({cols});')
sql.append("CREATE TABLE IF NOT EXISTS template_owner(id TEXT PRIMARY KEY,user_id TEXT NOT NULL);")
(r/'scripts/native/schema.sql').write_text('\n'.join(sql)+'\n')
(r/'server/native/schema.ts').write_text('export const schema: Record<string,Record<string,string>> = '+json.dumps(schema,indent=2)+'\n')
policy={'version':1,'defaults':{'require_auth':True},'modules':{'db':{'require_auth':True,'raw_sql':{'allowed':False},'row_level':{'mode':'none','owner_field':'user_id'},'tables':{t:{'read':'deny','write':'deny'} for t in [*schema,'template_owner']}}}}
(r/'scripts/native/security-policy.json').write_text(json.dumps(policy,indent=2)+'\n')
print('Generated',len(schema),'tables')
