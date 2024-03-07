import * as uuid from 'uuid';
import crypto from 'crypto'

/**
 * @module oauth20Service
 */

// TODO : Implement access_token timout and refresh_tokens
// TODO : Store expiration time on authorization requests

/**
 * Authorization Service that provides methods to complete OAuth2.0 flow as specified
 * in rfc6749.
 *
 * Some sections reproduced here for quick recall:
 * 1.1  Roles
 *
 *    OAuth defines four roles:
 *
 *    resource owner
 *       An entity capable of granting access to a protected resource.
 *       When the resource owner is a person, it is referred to as an
 *       end-user.
 *
 *    resource server
 *       The server hosting the protected resources, capable of accepting
 *       and responding to protected resource requests using access tokens.
 *
 *    client
 *       An application making protected resource requests on behalf of the
 *       resource owner and with its authorization.  The term "client" does
 *       not imply any particular implementation characteristics (e.g.,
 *       whether the application executes on a server, a desktop, or other
 *       devices).
 *
 *    authorization server
 *       The server issuing access tokens to the client after successfully
 *       authenticating the resource owner and obtaining authorization.
 *
 * 1.2.  Protocol Flow
 *
 *     +--------+                               +---------------+
 *     |        |--(A)- Authorization Request ->|   Resource    |
 *     |        |                               |     Owner     |
 *     |        |<-(B)-- Authorization Grant ---|               |
 *     |        |                               +---------------+
 *     |        |
 *     |        |                               +---------------+
 *     |        |--(C)-- Authorization Grant -->| Authorization |
 *     | Client |                               |     Server    |
 *     |        |<-(D)----- Access Token -------|               |
 *     |        |                               +---------------+
 *     |        |
 *     |        |                               +---------------+
 *     |        |--(E)----- Access Token ------>|    Resource   |
 *     |        |                               |     Server    |
 *     |        |<-(F)--- Protected Resource ---|               |
 *     +--------+                               +---------------+
 *
 *                     Figure 1: Abstract Protocol Flow
 *
 *  4.1.  Authorization Code Grant
 *
 *   The authorization code grant type is used to obtain both access
 *   tokens and refresh tokens and is optimized for confidential clients.
 *   Since this is a redirection-based flow, the client must be capable of
 *   interacting with the resource owner's user-agent (typically a web
 *   browser) and capable of receiving incoming requests (via redirection)
 *   from the authorization server.
 *
 *     +----------+
 *     | Resource |
 *     |   Owner  |
 *     |          |
 *     +----------+
 *          ^
 *          |
 *         (B)
 *     +----|-----+          Client Identifier      +---------------+
 *     |         -+----(A)-- & Redirection URI ---->|               |
 *     |  User-   |                                 | Authorization |
 *     |  Agent  -+----(B)-- User authenticates --->|     Server    |
 *     |          |                                 |               |
 *     |         -+----(C)-- Authorization Code ---<|               |
 *     +-|----|---+                                 +---------------+
 *       |    |                                         ^      v
 *      (A)  (C)                                        |      |
 *       |    |                                         |      |
 *       ^    v                                         |      |
 *     +---------+                                      |      |
 *     |         |>---(D)-- Authorization Code ---------'      |
 *     |  Client |          & Redirection URI                  |
 *     |         |                                             |
 *     |         |<---(E)----- Access Token -------------------'
 *     +---------+       (w/ Optional Refresh Token)
 *
 *   Note: The lines illustrating steps (A), (B), and (C) are broken into
 *   two parts as they pass through the user-agent.
 *
 *                     Figure 3: Authorization Code Flow
 *   Roost Implementation Notes:
 * @type {OAuth20Service}
 */
export default class OAuth20Service {
    /**
     * @param {int} [accessTokenExpiration] The number of seconds that access tokens stay valid
     * or 0 for no expiration, default 2,592,000 (30 days)
     * @param {int} [authorizationCodeExpiration]
     * or 0 for no expiration, default 600
     */
  constructor(accessTokenExpiration = 2_592_000, authorizationCodeExpiration = 600) {
    this.accessTokenExpiration = accessTokenExpiration  * 1000
    this.authorizationCodeExpiration = authorizationCodeExpiration * 1000
    this.initialized = false;
  }

  async close() {
    this.checkInitialized();
    await this.storage.close();
    this.initialized = false;
  }

    /**
     * @param {Connection} storage The storage provider
     */
  async init(storage, encryptionService) {
    if( this.initialized ) {
      throw new Error("OAuth 2.0 Service already initialized");
    }
    console.log('Initializing OAuth 2.0 Service')
    this.storage = storage;
    await this.storage.connect();
    this.encryptionService = encryptionService;
    this.initialized = true;
    console.log('OAuth 2.0 Service initialized')
  }

  checkInitialized() {
    if(!this.initialized) {
      throw new Error("OAuth2.0 Service not yet initialized");
    }
  }

  /**
   * Registers a client so that the client server can request access to resources.
   * The registration accepts a scope.  This scope can be used to apply business rules
   * against the scope requested during the authorization step.  This is done by monkey
   * patching the {@link OAuth20Service#checkAuthorizationScope} method.  A redirect_uri may
   * also be provided.  The redirect_uri is, by default, used as a default if the redirect_uri is
   * not provided during the authorization process.  The {@link #getRedirectURI getRefirectURI()} method
   * can be monkey patched to override this behaviour, in which case the redirect_uri
   * can be any object that function wants to work against.
   *
   * @param {String} client_id The client_id that uniquely identifies a client.
   * @param {String[]} [scope] A string or array of strings that represent
   * the resources the client will request access to.
   * @param {String|Object} [redirect_uri] The default redirect uri
   * @param {boolean} [require_pkce] If set then authorization flow will require Proof Key for Code Exchange (see rfc7636)
   * @param {Object} [data] Extra data the application can use such as the application name, developer name, url, or
   * other information the application may want to present to the user to facilitate authorization.
   */
  async register(client_id, scope, redirect_uri, require_pkce, data) {
    this.checkInitialized();
    const client_doc = {
      client_id: client_id,
      client_secret: uuid.v4(),
      scope: scope,
      redirect_uri: redirect_uri,
      require_pkce: require_pkce,
      data: data
    };

    await this.storage.createClient(client_doc);
    return client_doc.client_secret;
  }

  deleteClient(client_id) {
    this.checkInitialized();
    return this.storage.deleteClient(client_id);
  }

  getClient(client_id) {
    this.checkInitialized();
    return this.storage.getClient(client_id);
  }

  /**
   * Checks that the requested scope is compatible with the scope the client
   * asked for when registering.  By default this method does nothing.  Implementing
   * code should throw an appropriate exception if the request scope does not comply
   * with the business rules for a given registered client scope.
   * @param {String[]} requested_scope An array of scopes that were delivered as part of the authorization request.
   * @param {String[]} client_scope An array of scopes that the client provided when registered.
   * @throws throws and exception if the business rules are violated
   */
  // eslint-disable-next-line no-unused-vars
  checkAuthorizationScope(requested_scope,client_scope) {
  }

  /**
   * Returns the redirect uri. The default implementation returns redirect_uri if it is defined
   * otherwise it returns client.redirect_uri, or throws an exception if no redirect uri is provided.
   * Developers can monkey patch this method to apply their own logic, examples:
   * * Check that redirect_uri is the same uri as passed in during registration
   * * If an array of uri's was passed in during creation, check that redirect_uri is one of those
   *
   * @param {String} redirect_uri The redirect URI provided during authroization
   * @param {Object} client The client object
   * @returns {String} The redirect URI to use
   * @throws {String} Excpetion if no URI can be resolved
   */
  getRedirectURI(redirect_uri, client) {
    if( redirect_uri ) {
      return redirect_uri;
    } else if (client.redirect_uri) {
      return client.redirect_uri;
    }
    throw new Error("Could not resolve redirect uri from parameter or registered client");
  }

  /**
   * Implements RFC 6749 §4.1 transition from (B) to (C)
   *
   * The user (resource owner) has authenticated and confirmed that access should be granted to
   * the client (client_id) for a client to the (optionally) scoped resources owned by the resource owner.
   *
   * This method creates an access token document and returns the authorization code.
   *
   * @param {String} client_id The id of the requesting client
   * @param {String} resource_owner_id The id of the resource owner (e.g. user id, email, etc)
   * @param {String} [redirect_uri] The redirect_uri the resource owner's user-agent will be redirected to
   * typically a uri on the client's server.  If not provided the redirect_uri provided at the time of
   * registration will be used.
   * @param {String[]} [scope] An array of resource scopes which the client has been authorized to get
   * @param {String} [state] An opaque string used to ensure the communications between client and authorization
   * server are not forged.
   * @param {String} [code_challenge] PKCE code challenge (see rfc7636)
   * @param {String} [code_challenge_method] PKCE code challenge method either 'plain' or 'S256' (see rfc7636)
   *
   * @returns {String} Returns a URI as described in RFC 6749 §4.1.2, redirect_uri+'code=[code]&state=[state]'
   **/
  async createAccessToken(client_id, resource_owner_id, redirect_uri, scope, state,
    code_challenge, code_challenge_method, timeout) {

    const client = await this.storage.getClient(client_id);

    if(!Array.isArray(scope)) scope = [scope]

    this.checkAuthorizationScope(scope,client.scope);

    let expires = 0;
    if( timeout ) {
      expires = Date.now() + timeout;
    } else if ( this.accessTokenExpiration >0 ) {
      expires = Date.now() + this.accessTokenExpiration;
    }


    const access_token = uuid.v4()
    const access_token_doc = {
      resource_owner_id: resource_owner_id,
      token_type: "bearer",
      access_token: access_token,
      client_id: client_id,
      scope: scope,
      state: state,
      code_challenge: code_challenge,
      code_challenge_method: code_challenge_method,
      expires: expires,
      authorization_code_expires: 0
    };

    if ( this.authorizationCodeExpiration > 0 ) {
      await this.deleteAccessToken(access_token)
      access_token_doc.authorization_code_expires = Date.now() + this.authorizationCodeExpiration
    }

    await this.storage.insertAccessToken(access_token_doc)

    let qs = "code=" + access_token_doc.access_token_id;
    if( access_token_doc.state ) {
      qs = qs + "&state=" + access_token_doc.state;
    }

    redirect_uri = this.getRedirectURI(redirect_uri, client);
    redirect_uri =  redirect_uri +
            (redirect_uri.indexOf("?")>-1 ? "&" : "?" ) +
            qs;
    return redirect_uri;
  }


  /**
   * Implements RFC 6749 §4.1 transition from (D) to (E)
   *
   * Retrieves an access token based on the given authorization code.  The code references a previous authorization
   * established through a call to {@link #createAccessToken createAccessToken()}. The resources are in the scope member of the
   * authorization object.  Retrival of the access token must completed prior to the access token's `authorization_code_expires`
   * attribute (in milliseconds since epoch)
   *
   * @param {String} client_id The id of the client
   * @param {String} client_secret The client secret provided at the time of registration
   * @param {String} code The authorization code provide by {@link #authorize authorize()}
   * @returns {Object} An object with access/refresh token and access information (scope, etc.)
   * @throws {Error} Throws exception if the client secret is invalid, the authorization code is expired
   * or no authorization is found with the client_id/code pair, or if PKCE fails.
   */
  async requestAccessToken(client_id, client_secret, code, code_verifier) {
    console.debug(`requestAccessToken(${client_id}, ${client_secret}, ${code}, ${code_verifier})`)
    this.checkInitialized();
    const client = await this.storage.getClient(client_id);
    if( client.client_secret !== client_secret ) {
      throw new Error("Invalid client secret");
    }

    const access_token = await this.storage.getAccessTokenByCode(code)
    console.debug('access_token')
    console.debug(access_token)

    if( access_token &&
      access_token.client_id == client_id) {
      if(access_token.authorization_code_expires>0 &&
        access_token.authorization_code_expires<Date.now()) {
        throw new Error("authorization code expired");
      }
      if(access_token.code_challenge || code_verifier || client.require_pkce) {
        switch( access_token.code_challenge_method ) {
          case "plain":
            if(access_token.code_challenge !== code_verifier) {
              throw new Error("invalid_grant");
            }
            break;
          case "S256":
            if(access_token.code_challenge !== S256(code_verifier)) {
              throw new Error("invalid_grant");
            }
            break;
          default:
            throw new Error(`Code challenge method ${access_token.code_challenge_method}`);
        }
      }
    } else {
      throw new Error(`No access token with client_id "${client_id}" and authorization code "${code}"`);
    }
        // @todo add access token expiration and refresh tokens
    const refresh_token = this.encryptionService.encrypt(access_token.access_token)
    return {
      token_type: "bearer",
      access_token: access_token.access_token,
      refresh_token: refresh_token,
      scope: access_token.scope,
      expires: access_token.expires
    };
  }

  /**
   * Returns the access token document based on the access_token_Id
   * @param {String} access_token The access_token sent by the client
   *
   * @typedef {Object} AccessToken
   * @property {string} resource_owner_id - The id of the resource owner
   * @property {string} token_type - The type of the access token, always "bearer
   * @property {string} access_token - The access token value
   * @property {string[]} scope - The the scope of the access token
   * @property {string} resource_owner_id - The id of the resource owner
   * @property {string} code_challenge
   * @property {string} code_challenge_method
   * @property {string} expires
   * @property {string} authorization_code_expires
   *
   * @returns {AccessToken} An object with access/refresh token and access information (scope, etc.)
   *
   **/

  getAccessToken(access_token) {
    this.checkInitialized();
    return this.storage.getAccessToken(access_token);
  }

  /**
   * Deletes an access token document based on the access_token_code.
   *
   * @param {String} access_token The access_token sent by the client
   **/
  deleteAccessToken(access_token) {
    this.checkInitialized();
    return this.storage.deleteAccessToken(access_token);
  }
}

// @todo move to a util class
function S256(code_verifier) {
  return crypto.createHash('sha256')
    .update(code_verifier)
    .digest('base64')
    .replace(/\+/g,'-')
    .replace(/\//g,'_')
    .replace('=','');
}

