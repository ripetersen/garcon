# garcon
Garcon is a node HTTP server framework.  Garcon used the [KOA](https://koajs.com/) web framework.  The
purpose of Garcon, then, is to provide some useful functionality.

## Routing
Garcon provides some convient concepts and code to support the routing and securing 
of web requests.

### Endpoint Mapping
Routing is built around the concept of "controllers" which are intended to provide a set of endpoints
which are related.  The setup function is responsible for constructing the necessary controllers
and providing the "top-level" URL.  The controler is responsible for specifying the URL and method
for the individual endpoints.

The intention is that the server implementer decides where a serice exists in that server's URL space
while the individual endpoints are specified by the controller.

For example, let's supose you have a controller to maintain shopping cart state.  The 'store' may decide
to map that controller to either:
* /basket
* /cart
* /trolley 
depending on their preference.  The controler would, however, map the functions.
* `POST /[cart]/item` - might add an item to the cart
* `GET /['cart']/total` - might return the total cost of the items in the cart/basket whatever

### Authentication
Garcon provides boilerplate for the following autorization types: None, Basic, OAuth 2.0, JWT.


#### None
The server will call the endpoint without any authorization

#### Basic Authorization 
Authorizes requests based on [rfc7235](https://datatracker.ietf.org/doc/html/rfc7235).  
This router will call the `authorize` method of an `AccountService` to determine
if the credentials are authorized.

#### OAuth 2.0
Given an access token the OAuth 2.0 router will uses an `OAuth20Service` implementation to 
retrieve an access token document based on the access token.  HTTP routes may specify a
scope when using the the OAuth 2.0 router.  

The parameters of the access granted by the user are stored as an "access token document".  This document
includes an optional list of scopes and an experation time.

If the access token resolves to an acces token document, the router will allow the invocation of the handeling
function if one of the following is true:
* no scope was specified when the route was configured
* the scope specified in the access token document is one of the configured scopes
* the scope specified in the access token document is `*`

## Services
Garcon provides the a service registry and configuration system.  Services are exposed
by creating ES6 modules in a directory in the `CONFIG_PATH` environment variable.
Modules are loaded using `import()`.  Once imported the services system checks for the 
following exports: `init`, `stop`, and `provider`

### init()
If an `init` function is exported it is called at load time with the signature:
`export async function init(services, config, globalConfig, __filename, __dirname)`
* `services` : the services regustry, other services are available using the `get()` function
* `config` : the configuration object for the service (see below)
* `globalConfig` : the configuration object for all services
* `__filename` : the filename of the module
* `__dirname` : the directory name which contains the module

### stop()
Exporting the `stop()` function allows a service to gracefully shutdown, if the server itself
gets shutdown gracefully.

### provider
An object/value/function can be exported as a `provider`.  The `provider` is returned when 
other code calls `services.get([service_name])` with the name of the service.

## Configuration
As shown above the services are provided a `config` object containing 

## Object Store interface

## REPL Environment


