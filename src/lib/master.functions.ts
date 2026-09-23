import { callBackend } from '@/blink/backend'
export const createBarbershopWithOwner = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/master.functions", name:"createBarbershopWithOwner",data:args.data})
export const setSuperAdminEmails = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/master.functions", name:"setSuperAdminEmails",data:args.data})
export const setAppBrand = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/master.functions", name:"setAppBrand",data:args.data})
