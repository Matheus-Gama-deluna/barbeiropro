export async function ownerEligible(auth:{userId:string,email?:string},env:Record<string,string>,sql:{sql:(q:string,args:any[])=>Promise<{rows:any[]}>}){
 if(!auth.userId||!env.BLINK_PROJECT_ID||env.OWNER_PROJECT_ID!==env.BLINK_PROJECT_ID)return false
 if(env.OWNER_USER_ID&&auth.userId===env.OWNER_USER_ID)return true
 const ownerEmail=env.OWNER_EMAIL?.trim().toLowerCase()
 if(!ownerEmail||auth.email?.trim().toLowerCase()!==ownerEmail)return false
 const row=(await sql.sql('SELECT email,email_verified FROM users WHERE id=? LIMIT 1',[auth.userId])).rows[0]
 return !!row&&Number(row.email_verified)===1&&String(row.email).trim().toLowerCase()===ownerEmail
}
