import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
export default defineConfig({resolve:{dedupe:['react','react-dom']},server: {
    allowedHosts: true,port:3000,host:true},plugins:[tsconfigPaths(),tailwindcss(),tanstackRouter({target:'react',autoCodeSplitting:true,routeFileIgnorePattern:'api/'}),react()]})
