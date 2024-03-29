"use strict";
import Koa from "koa";
import * as path from "path";
import AuthMiddleware from "./authMiddleware.js";

const app = new Koa();

async function init(setup, server, shutdownListener) {
  const setup_file = path.isAbsolute(setup)
    ? setup
    : path.normalize(path.join(process.cwd(), setup));
  const setup_module = await import(setup_file);
  /** @type {AuthMiddleware}*/
  const middleware = new AuthMiddleware();
  await middleware.init();
  await setup_module.default(app, server, middleware, async () => {
    await shutdownListener();
    process.exit(0);
  });

  app.use(middleware.call());

  console.debug("Server initalized");
  console.debug("routes:");
  middleware.routes.forEach((route) => {
    route.methods.forEach((method) => {
      console.debug(`${method.toUpperCase()} ${route.path}`);
    });
  });
}

export async function start(config, shutdownHook) {
  await init(config.setup, app.listen(config.port), shutdownHook);
  console.log("listening on port " + config.port);
}

export async function dont_cache_200(ctx, next) {
  await next();
  if (ctx.response.status >= 200 && ctx.response.status <= 299) {
    ctx.set("Cache-Control", ["no-store", "max-age=0"]);
  }
}

export async function CORS(ctx, next) {
  ctx.set("Access-Control-Allow-Origin", ctx.request.header.origin);
  ctx.set("Access-Control-Allow-Credentials", "true");
  ctx.set(
    "Access-Control-Allow-Headers",
    "Accept, Accept-Language, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, If-Match, If-None-Match, Keep-Alive, Origin, User-Agent, X-Requested-With, Captcha",
  );
  ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.set("Access-Control-Expose-Headers", "Authorization, ETag");

  if (ctx.request.method === "OPTIONS") {
    // Tell client that this pre-flight info is valid for 20 days
    ctx.set("Access-Control-Max-Age", 1728000);
    ctx.set("Content-Type", "text/plain charset=UTF-8");
    ctx.set("Content-Length", 0);
    ctx.response.status = 204;
  } else {
    await next();
  }
}

export function ping(path) {
  return async (ctx, next) => {
    if (ctx.request.path === path) {
      ctx.set("Content-Type", "text/plain charset=UTF-8");
      ctx.set("Content-Length", 0);
      ctx.body = "";
      ctx.response.status = 200;
    } else {
      await next();
    }
  }
}

export async function request_logger(ctx, next) {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  await next();
}

export async function response_logger(ctx, next) {
  await next();
  console.log(`[${ctx.response.status}] ${ctx.request.url}`);
}
