import { blink } from '@/blink/client'
import { createBlinkDataClient } from './compat'
const failure = (error: unknown) => ({ message: error instanceof Error ? error.message : String(error) })
async function session() {
  await blink.auth.initialize()
  const token = await blink.auth.getValidToken()
  const user = blink.auth.currentUser()
  return token && user ? { access_token: token, user } : null
}
const auth = {
  getUser: async () => {
    try { const current = await session(); return { data: { user: current?.user ?? null }, error: null } }
    catch (error) { return { data: { user: null }, error: failure(error) } }
  },
  getSession: async () => {
    try { return { data: { session: await session() }, error: null } }
    catch (error) { return { data: { session: null }, error: failure(error) } }
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    try { const user = await blink.auth.signInWithEmail(email, password); return { data: { user, session: await session() }, error: null } }
    catch (error) { return { data: { user: null, session: null }, error: failure(error) } }
  },
  signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
    try { const user = await blink.auth.signUp({ email, password, metadata: options?.data }); return { data: { user, session: await session() }, error: null } }
    catch (error) { return { data: { user: null, session: null }, error: failure(error) } }
  },
  signOut: async () => { try { await blink.auth.signOut(); return { error: null } } catch (error) { return { error: failure(error) } } },
  updateUser: async ({ password, currentPassword, resetToken }: { password?: string; currentPassword?: string; resetToken?: string }) => {
    try {
      if (!password) return { error: null }
      if (resetToken) await blink.auth.confirmPasswordReset(resetToken, password)
      else if (currentPassword) await blink.auth.changePassword(currentPassword, password)
      else return { error: { message: 'Para alterar a senha, informe a senha atual ou use o link de recuperação enviado por e-mail.' } }
      return { error: null }
    } catch (error) { return { error: failure(error) } }
  },
  resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
    try { await blink.auth.sendPasswordResetEmail(email, { redirectUrl: options?.redirectTo }); return { error: null } }
    catch (error) { return { error: failure(error) } }
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      const token = blink.auth.getToken()
      callback(state.isAuthenticated ? 'SIGNED_IN' : 'SIGNED_OUT', state.isAuthenticated && token && state.user ? { access_token: token, user: state.user } : null)
    })
    return { data: { subscription: { unsubscribe } } }
  },
}
export const supabase = Object.assign(createBlinkDataClient(blink), { auth })
