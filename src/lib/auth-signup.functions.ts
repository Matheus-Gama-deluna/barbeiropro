import { callBackend } from '@/blink/backend'
export const checkEmailExists = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/auth-signup.functions", name:"checkEmailExists",data:args.data})
export const signupTrial = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/auth-signup.functions", name:"signupTrial",data:args.data})
