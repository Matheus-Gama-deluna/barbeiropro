import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'barbeiropr-template-para-hvhrtn4r',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_XrYp80UndUy1L8SDLREUixXPPEmtMfJY',
  authRequired: false,
  auth: { mode: 'managed' },
})
