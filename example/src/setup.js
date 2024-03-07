import Koa from 'koa';
import * as garcon from 'garcon/server'
import bodyParser from 'koa-bodyparser';
import ShutdownController from 'garcon/shutdownController'
import EchoController from 'garcon/echoController'
import AboutController from 'garcon/aboutController'

/**
 * 
 * @param {Koa} app 
 * @param {Koa.server} server 
 * @param {garcon.AuthMiddleware} middleware 
 * @param {function} shutdownListener 
 */
export default async function setup(app, server, middleware, shutdownListener) {

  // Log all requests
  app.use(garcon.request_logger)

  // don't cache successful requests
  app.use(garcon.dont_cache_200)

  // ping for health check
  app.use(garcon.ping)

  // CORS
  app.use(garcon.CORS)

  // Body parser
  let bp = bodyParser({"enableTypes": ['json', 'form', 'text']});
  app.use(bp);

  // Log all responses
  app.use(garcon.response_logger)

  const shutdownController = new ShutdownController(server, shutdownListener)
  shutdownController.route(middleware.getRouter('/shutdown'))

  const echoController = new EchoController()
  echoController.route(middleware.getRouter('/echo'))

  const aboutController = new AboutController()
  await aboutController.route(middleware.getRouter('/about'))
}