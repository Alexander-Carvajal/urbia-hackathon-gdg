import { createServer } from './app.mjs'

const port = Number(process.env.API_PORT ?? 8787)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválido')
createServer().listen(port, () => console.log(`API de inundaciones: http://localhost:${port}/api/inundaciones`))
