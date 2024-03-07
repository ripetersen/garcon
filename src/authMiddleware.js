import { pathToRegexp } from 'path-to-regexp';
import services from './services.js';
import JWTService from './jwtService.js';
import OAuth20Service from './oauth20Service.js';
import AccountService from './accountService.js';

/**
 * @module authMiddleware
 */

/**
 * The default class
 */
export default class AuthMiddleware {
  /**
   * The midleware which authenticates and routes calls
   */
  constructor() {
    this.routes=[];
    this.routeMap = new Map();
    this.routeHTTPBasicMap = new Map();
    this.routeOAuth20Map = new Map();
    this.routeJWTMap = new Map();
    /** @type {AccountService} */
    this.accountService = null;
    /** @type {OAuth20Service} */
    this.oauth20Service = null;
    /** @type {JWTService} */
    this.jwtService = null;
  }

  async init() {
    if( await services.hasService('account') ) {
      this.accountService = await services.get('account')
    }
    if( await services.hasService('oauth20') ) {
      this.oauth20Service = await services.get('oauth20')
    }
    if( await services.hasService('jwt') ) {
      this.jwtService = await services.get('jwt')
    }
  }

  call() {
    let self = this;
    return async function(ctx,next) {
      try {
        await self._call(ctx,next);
      } catch (err) {
        console.error(`Error processing`)
        console.error(ctx)
        console.error(err)
      }
    };
  }

  /**
   * @external koa
   * @param {koa.Context} ctx
   * @param {Function} next
   * @returns {Promise<void>}
   */
  async _call(ctx, next) {
    console.debug(`routing ${ctx.request.method.toUpperCase()} '${ctx.request.path}'`)
    for(let i=0; i<this.routes.length; i++) {
      const route = this.routes[i];
      const params=route.handles(ctx);
      if( params ) {
        ctx.request.params = {};
        for( let j=1; j<params.length; j++ ) {
          ctx.request.params[route.keys[j-1].name] = decodeURIComponent(params[j]);
        }
        try {
          await route.call(ctx);
        } catch(err) {
          console.error(err)
          ctx.response.status = 500;
          return
        }
        if( ctx.response.status == 401 ||
          ctx.response.status == 403 )  {
          return
        }
        // TODO: should we break or allow other routes to handle the request
        break;
      }
    }

    await next();
  }

  /**
   * 
   * @param {string} prefix 
   * @returns AuthMiddleware
   */
  getRouter(prefix) {
    const middleware = this;
    return {
      route: (path, options) => middleware.route(prefix + path, options),
      routeHTTPBasic: (path, options) => middleware.routeHTTPBasic(prefix + path, options),
      routeOAuth20: (path, options) => middleware.routeOAuth20(prefix + path, options),
      routeJWT: (path, options) => middleware.routeJWT(prefix + path, options)
    };
  }

  /**
   * 
   * @param {String|RegExp} path
   * @param {*} options 
   * @returns Route
   */
  route(path, options) {
    if(this.routeMap.has(path.toString())) {
      return this.routes[this.routeMap.get(path.toString)];
    }
    const route = new Route(path, options);
    this.routeMap.set(path.toString(),this.routes.push(route)-1);
    return route;
  }

  /**
   * 
   * @param {*} path 
   * @param {*} options 
   * @returns HTTPBasicRoute
   */
  routeHTTPBasic(path, options) {
    if(this.routeHTTPBasicMap.has(path.toString())) {
      return this.routes[this.routeHTTPBasicMap.get(path.toString)];
    }
    const route = new HTTPBasicRoute(path, this.accountService, options);
    this.routeHTTPBasicMap.set(path.toString(),this.routes.push(route)-1);
    return route;
  }

  /**
   * 
   * @param {*} path 
   * @param {*} options 
   * @returns OAuth20Route
   */
  routeOAuth20(path, options) {
    if(this.routeOAuth20Map.has(path.toString())) {
      return this.routes[this.routeOAuth20Map.get(path.toString)];
    }
    const route = new OAuth20Route(path, this.accountService, this.oauth20Service, options);
    this.routeOAuth20Map.set(path.toString(),this.routes.push(route)-1);
    return route;
  }

  /**
   * 
   * @param {*} path 
   * @param {*} options 
   * @returns JWTRoute
   */
  routeJWT(path, options) {
    if(this.routeJWTMap.has(path.toString())) {
      return this.routes[this.routeJWTMap.get(path.toString)];
    }
    const route = new JWTRoute(path, this.accountService, this.jwtService, options);
    this.routeJWTMap.set(path.toString(),this.routes.push(route)-1);
    return route;
  }
}

class Route {
  /**
   * The path to apply the route to
   * @param {String|RegExp} path
   */
  constructor(path, options) {
    this.method = new Map();
    this.middleware = [];
    this.keys = [];
    if( path instanceof RegExp ) {
      this.path = path;
    } else {
      this.path = pathToRegexp(path.toString(),this.keys, options);
    }
  }

  async call(ctx) {
    let f = this.getMethod(ctx);
    if( !f ) {
      ctx.status = 404;
    } else {
      await this.invoke(f,ctx);
    }
  }

  async invoke(f,ctx) {
    // Call the middlewares
    const mw  = [...this.middleware];
    mw.push(f);
    let i = 0;
    let next = async () => {
      if( i<mw.length ) {
        i++;
        await mw[i-1](ctx,next);
      }
    };
    await next();
  }

  /**
   * Returns if this route can handle the given request
   **/

  handles(ctx) {
    console.debug(`checking ${this.methods} '${this.path}'`)
    const params = this.path.exec(ctx.request.path);
    if( params && (this.method.has('ANY') || this.method.has(ctx.request.method.toUpperCase()))) {
      return params
    }
  }

  /**
   * Returns the HTTP methods the route supports
   * @returns {string[]}
   **/
  get methods() {
    return Array.from(this.method.keys());
  }

  getMethod(ctx) {
    let m = this.method.get(ctx.method.toUpperCase());
    if( !m ) {
      m = this.method.get('ANY');
    }
    if(!m) {
      console.debug(`Router[${this.path}] handler for method '${ctx.method.toUpperCase()}' not found.`)
    }
    return m;
  }

  use(f) {
    this.middleware.push(f);
    return this;
  }

  get(f) {
    this.method.set('GET',f);
    return this;
  }
  head(f) {
    this.method.set('HEAD',f);
    return this;
  }
  put(f) {
    this.method.set('PUT',f);
    return this;
  }
  post(f) {
    this.method.set('POST',f);
    return this;
  }
  patch(f) {
    this.method.set('PATCH',f)
    return this;
  }
  delete(f) {
    this.method.set('DELETE',f)
    return this;
  }
  any(f) {
    this.method.set('ANY',f);
    return this;
  }

  sendUnauthorized(ctx,authentication) {
    ctx.response.status = 401;
    ctx.response.set('WWW-Authenticate',authentication);
  }
}

class HTTPBasicRoute extends Route {
  /**
   * @param path
   * @param accountService
   */
  constructor(path, accountService, options) {
    super(path, options);
    this.accountService = accountService;
  }

  async call(ctx) {
    let f = this.getMethod(ctx);
    if( !f ) {
      ctx.status = 404;
    } else {
      const authorization = ctx.headers.authorization;
      if( authorization &&
        authorization.substr(0,6).toLowerCase() === 'basic ') {
        const basic_authorization = Buffer
          .from(authorization.substr(6), 'base64')
          .toString('utf8');
        try {
          const [,type,login_id,password] = /([^:]+):([^:]+):(.*)/gm.exec(basic_authorization)
          ctx.state.account = await this.accountService.authenticate(type, login_id, password);
          await this.invoke(f,ctx);
        } catch (e) {
          ctx.status = 403;
        }
      } else {
        this.sendUnauthorized(ctx);
      }
    }
  }

  sendUnauthorized(ctx) {
    super.sendUnauthorized(ctx,'Basic');
  }
}

class JWTRoute extends Route {
  /**
   * @param {RegExp|String} path Path to route for
   * @param {AccountService} accountService
   * @param {JWTService} jwtService
   */
  constructor(path, accountService, jwtService, options) {
    super(path, options);
    /** @type {JWTService} */
    this.jwtService = jwtService;
    /** @type {AccountService} */
    this.accountService = accountService;
  }

  // TODO: add other method
  get(f, allow) {
    this.method.set('GET', {f:f,allow:allow});
    return this;
  }
  put(f, allow) {
    this.method.set('PUT', {f:f,allow:allow});
    return this;
  }
  post(f, allow) {
    this.method.set('POST', {f:f,allow:allow});
    return this;
  }
  patch(f, allow) {
    this.method.set('PATCH', {f:f,allow:allow});
    return this;
  }
  delete(f, allow) {
    this.method.set('DELETE', {f:f,allow:allow});
    return this;
  }
  any(f, allow) {
    this.method.set('ANY', {f:f,allow:allow});
    return this;
  }

  async call(ctx) {
    let m = this.getMethod(ctx);
    if( !m ) {
      ctx.status = 404;
    } else {
      const allow = m.allow;
      const f = m.f;
      // Check the authorization header
      const authorization = ctx.headers.authorization;
      if( authorization &&
        authorization.substr(0,7).toLowerCase() === 'bearer ') {
        const json_web_token = authorization.substr(7);
        try {
          const jwt_doc = await this.jwtService.getPayload(json_web_token); 
          const is_allowed = !allow || allow(jwt_doc);
          if( is_allowed ) {
            ctx.state.jwt = jwt_doc;
            if(this.accountService) {
              ctx.state.account = await this.accountService.getAccountByKey(jwt_doc.iss+'|'+jwt_doc.sub);
            }
            await this.invoke(f,ctx);
          } else {
            this.sendUnauthorized(ctx);
          }
        } catch(e) {
          this.sendUnauthorized(ctx);
        }
      } else {
        this.sendUnauthorized(ctx);
      }
    }
  }

  sendUnauthorized(ctx) {
    super.sendUnauthorized(ctx,'Bearer');
  }
}

class OAuth20Route extends Route {
  /**
   * @param {RegExp|String} path Path to route for
   * @param {OAuth20Service} oauth20Service
   */
  constructor(path, accountService, oauth20Service, options) {
    super(path, options);
    this.oauth20Service = oauth20Service;
    this.accountService = accountService;
  }

  // TODO: add other method
  get(f, scope) {
    this.method.set('GET', {f:f,scope:scope});
    return this;
  }
  put(f, scope) {
    this.method.set('PUT', {f:f,scope:scope});
    return this;
  }
  post(f, scope) {
    this.method.set('POST', {f:f,scope:scope});
    return this;
  }
  patch(f, scope) {
    this.method.set('PATCH', {f:f,scope:scope});
    return this;
  }
  delete(f, scope) {
    this.method.set('DELETE', {f:f,scope:scope});
    return this;
  }
  any(f, scope) {
    this.method.set('ANY', {f:f,scope:scope});
    return this;
  }

  async call(ctx) {
    let m = this.getMethod(ctx);
    if( !m ) {
      ctx.status = 404;
    } else {
      const scope = m.scope;
      const f = m.f;
      // Check the authorization header
      const authorization = ctx.headers.authorization;
      if( authorization && authorization.substr(0,7).toLowerCase() === 'bearer ') {
        const access_token = authorization.substr(7);
        const access_token_doc = await this.oauth20Service.getAccessToken(access_token);
        if( access_token_doc ) {
          // TODO: Check the experation time
          if( !scope ||
            access_token_doc.scope.indexOf(scope)>-1 ||
            access_token_doc.scope.indexOf('*')>-1 ) {
            ctx.state.access_token = access_token_doc;
            ctx.state.account = await this.accountService.getAccountByKey(access_token_doc.resource_owner_id);
            // TODO: AddAsyncLocalStorage (also for BasicAuth)
            await this.invoke(f,ctx);
          } else {
            ctx.status = 403;
          }
        } else {
          ctx.status = 403;
        }
      } else {
        this.sendUnauthorized(ctx);
      }
    }
  }

  sendUnauthorized(ctx) {
    super.sendUnauthorized(ctx,'Bearer');
  }
}

export {Route, HTTPBasicRoute, JWTRoute, OAuth20Route}
