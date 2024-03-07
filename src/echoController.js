import * as crypto from 'crypto'
import {Route} from './authMiddleware.js'

async function echo(ctx, extra) {
  let echo_body
  if(ctx.request.is('application/octet-stream')) {
    const sha256 = await new Promise( (resolve, reject) => {
      const hash = crypto.createHash('sha256')
      ctx.req.on('data', (chunk) => hash.update(chunk))
      ctx.req.on('end', () => resolve(hash.digest('hex')))
    })
    echo_body=`sha265 = ${sha256}`
  } else {
    echo_body = ctx.request.rawBody || '<none>'
  }

  ctx.body = `<html><head><title>echo</title></head><body><pre>
${ctx.request.method} ${ctx.request.href} HTTP/${ctx.req.httpVersion}
${Object.entries(ctx.request.headers).map(kv=>kv[0]+': '+kv[1]).join('\n')}

body : 
${echo_body}

state:
${JSON.stringify(ctx.state,null,2)}

request.URL = ${ctx.request.URL}
request.href = ${ctx.request.href}
request.path = ${ctx.request.path}
request.search = ${ctx.request.search}
request.querystring = ${ctx.request.querystring}
request.query = ${JSON.stringify(ctx.request.query,null,2).split('\n').join("\n                ")}
request.host = ${ctx.request.host}
request.hostname = ${ctx.request.hostname}
request.ip = ${ctx.request.ip}

</pre></body></html>`
}

export default class EchoController {
  /**
   * @param {Route} router 
   */
  route(router) {
    router.routeJWT('/jwt',{end:false}).any((ctx) => echo(ctx),(jwt) => jwt.iss === 'issuer')
    router.route('/',{end:false}).any((ctx) => echo(ctx))
  }
}
