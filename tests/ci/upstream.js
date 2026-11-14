import http from 'node:http'
import { createHash } from 'node:crypto'

// This fixture never connects to the real backend, database or external providers.
const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json')
  if (request.url === '/healthz') {
    response.end(JSON.stringify({ ready: true }))
  } else if (request.url === '/probe?scope=ci') {
    response.end(JSON.stringify({ path: request.url, authorized: request.headers.authorization === 'Bearer ci-only' }))
  } else {
    response.writeHead(request.url === '/auth/me' ? 401 : 404)
    response.end(JSON.stringify({ succeeded: false }))
  }
})
server.on('upgrade', (request, socket) => {
  if (request.url !== '/ws?scope=ci' || request.headers.authorization !== 'Bearer ci-only' || !request.headers['sec-websocket-key']) {
    socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
    return
  }
  const accept = createHash('sha1').update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
  const payload = Buffer.from('ci-websocket-ok')
  socket.write(Buffer.concat([Buffer.from([0x81, payload.length]), payload]))
  socket.on('error', () => {})
})
server.listen(8080, '0.0.0.0')
