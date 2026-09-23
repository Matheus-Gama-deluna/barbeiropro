export type QuerySpec = { table: string; action: string; columns: string; filters: {key:string;op:string;value:any}[]; orders:{key:string;ascending:boolean}[]; limit?:number; offset?:number; payload?:any; conflict?:string; head?:boolean; cardinality?:string }
export class Query implements PromiseLike<any> {
  spec: QuerySpec
  constructor(table:string, private execute:(spec:QuerySpec)=>Promise<any>) { this.spec={table,action:'select',columns:'*',filters:[],orders:[]} }
  select(columns='*', options:any={}) {this.spec.columns=columns;this.spec.head=!!options.head;return this}
  filter(key:string,op:string,value:any) {this.spec.filters.push({key,op,value});return this}
  eq(k:string,v:any){return this.filter(k,'eq',v)}
  neq(k:string,v:any){return this.filter(k,'neq',v)}
  is(k:string,v:any){return this.filter(k,'is',v)}
  gt(k:string,v:any){return this.filter(k,'gt',v)}
  gte(k:string,v:any){return this.filter(k,'gte',v)}
  lt(k:string,v:any){return this.filter(k,'lt',v)}
  lte(k:string,v:any){return this.filter(k,'lte',v)}
  ilike(k:string,v:any){return this.filter(k,'ilike',v)}
  in(k:string,v:any){return this.filter(k,'in',v)}
  not(k:string,op:string,v:any){if(op!=='is'||v!==null)throw new Error('Filtro não suportado');return this.filter(k,'notnull',null)}
  order(key:string,opts:any={}){this.spec.orders.push({key,ascending:opts.ascending!==false});return this}
  limit(n:number){this.spec.limit=n;return this}
  range(a:number,b:number){this.spec.offset=a;this.spec.limit=b-a+1;return this}
  insert(v:any){this.spec.action='insert';this.spec.payload=v;return this}
  upsert(v:any,opts:any={}){this.spec.action='upsert';this.spec.payload=v;this.spec.conflict=opts.onConflict;return this}
  update(v:any){this.spec.action='update';this.spec.payload=v;return this}
  delete(){this.spec.action='delete';return this}
  single(){this.spec.cardinality='one';return this}
  maybeSingle(){this.spec.cardinality='maybe';return this}
  then<TResult1=any,TResult2=never>(ok?:((value:any)=>TResult1|PromiseLike<TResult1>)|null,fail?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null):Promise<TResult1|TResult2>{return this.execute(this.spec).then(ok,fail)}
}
