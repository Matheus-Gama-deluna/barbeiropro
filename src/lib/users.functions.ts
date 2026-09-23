import { callBackend } from '@/blink/backend'
export const signUpInterno = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"signUpInterno",data:args.data})
export const resetAdminPassword = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"resetAdminPassword",data:args.data})
export const createTeamMember = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"createTeamMember",data:args.data})
export const updateTeamMemberRole = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"updateTeamMemberRole",data:args.data})
export const setTeamMemberActive = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"setTeamMemberActive",data:args.data})
export const resetTeamMemberPassword = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"resetTeamMemberPassword",data:args.data})
export const removeTeamMember = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/users.functions", name:"removeTeamMember",data:args.data})
