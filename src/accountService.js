import {EventEmitter} from 'events';
import * as util from './util.js';
import services from './services.js';
import * as accountHash from './accountHash.js';

export default class AccountService extends EventEmitter {
  /**
   *
   * @param {Object} storage
   */
  constructor() {
    super()
    this.hash = accountHash.argon2();
    this.initalized = false;
  }

  async close() {
    await this.storage.close();
    this.initalized = false;
  }

  async init(config, storage, oauthService, authProviders) {
    if( this.initalized ) {
      throw new Error("Account Service already initialized");
    }
    console.log('Initializing Account Service')
    this.storage = storage;
    await this.storage.connect();
    this.config = config;
    this.oauthService = oauthService;
    this.authProviders = authProviders
    this.initalized = true;
    console.log('Account Service initialized')
  }

  checkInitialized() {
    if(!this.initalized) {
      throw new Error("Account Service not yet initialized");
    }
  }

  /** Returns an array of authentication provider names
   * @returns {string[]}
   **/
  get providerNames() {
    return Object.keys(this.authProviders);
  }

  /**
   * Returns the account document with the given account id.
   * @param id
   * @returns {*}
   */
  read(id) {
    return this.storage.getAccount(id)
  }

  /**
   * Deletes the account with the given id
   * @param id
   * @returns {Promise<Boolean>}
   */
  delete(id) {
    return this.storage.deleteAccount(id);
  }

  /**
   * Adds an account with the given login, password.  Additional logins's can
   * be added such as a phone number or SSO token
   * @param {Object} login - The account login object
   * @param {string} login.value - The account login
   * @param {string} login.type - The account login type (email, phone, SSO Token, etc)
   * @param {string} password
   * @returns {Object} account
   */
  async create(login,password) {
    this.checkInitialized();
    const authProvider = this.authProviders[login.type];
    if(!authProvider) {
      throw new Error(`No provider for authentication type ${login.type}`)
    }
    const account = await authProvider.createAccount(login.value, password)
    this.emit('create',account)
    return account;
  }

  /**
   * Adds an additional login to an account
   * @param {string} id - The existing account id
   * @param {Object} login
   * @param {string} login.value - The value of the id
   * @param {string} login.type - The type of the id (email, phone, etc)
   * @returns {Promise<void>}
   */
  async addLogin(account_id, login) {
    this.checkInitialized();
    const authProvider = this.authProviders[login.type];
    if(!authProvider) {
      throw new Error(`No provider for authentication type ${login.type}`)
    }
    await authProvider.addLoginToAccount(account_id, login.value)
    this.emit('add',account_id, login)
  }


  /**
   * Returns true if an account with the given account id exists
   * @param type
   * @param login id
   * @returns {Promise<boolean>}
   */
  loginExists(type, id) {
    this.checkInitialized();
    const authProvider = this.authProviders[type];
    if(!authProvider) {
      throw new Error(`No provider for authentication type ${type}`)
    }
    return authProvider.loginExists(id)
  }

  /**
   * Sets the reference id for the given account object.  For example this might be a reference
   * to a profile document that contains additional profile information.
   * @param id
   * @param reference_id
   * @returns {Promise<boolean>}
   */
  async setReference(id,reference_id) {
    this.checkInitialized();
    await this.storage.updateAccount(id,{_reference: reference_id});
    return true;
  }

  /**
   * Authenticates the given password against the given login.
   * @param login
   * @param password
   * @returns {Promise<*>}
   */
  authenticate(type, login, password) {
    this.checkInitialized();
    const authProvider = this.authProviders[type];
    if(!authProvider) {
      throw new Error(`No provider for authentication type ${type}`)
    }
    return authProvider.authenticate(login, password)
  }

  getAccountByKey(account_key) {
    this.checkInitialized();
    return this.storage.getAccountByKey(account_key)
  }

  /**
   * Used to create an access token internally
   **/
  async createAccessToken(account) {
    console.debug(`createAccessToken()`)
    console.debug(account)
    console.debug(this.config.oauth)
    const url = await this.oauthService.createAccessToken(
      this.config.oauth.client_id,
      this.storage.getAccountKey(account),
      "http://localhost/", // meaningless
      "*");
    console.debug(`redirect url: ${url}`)
    const code = new URL(url).searchParams.get('code')
    const access_token = await this.oauthService.requestAccessToken(
      this.config.oauth.client_id,
      this.config.oauth.client_secret,
      code)
    return access_token
  }

  /**
   * Used to delete an access token. Remove access to some internal
   * external service.
   **/
  async deleteAccessToken(access_token) {
    return await this.oauthService.deleteAccessToken(access_token)
  }

  // TODO: move to notification service?
  verifyNotification(tokenService, scenario, type, id, token) {
    const authProvider = this.authProviders[type];
    if(!authProvider) {
      throw new Error(`No provider for authentication type ${type}`)
    }
    const notificationId = authProvider.getNotificationId(id)
    return tokenService[scenario][type].verify(id, notificationId)
  }

  async sendNotification(tokenService, address, channel, template, vars) {
    vars = vars || {};
    vars.address = address
    vars.channel = channel
    vars.token = tokenService[channel].generate(address)
    vars.config = await services.get('config')

    let filter = {
      phone: util.string.digitsOnly(address),
      email: (a) => a
    }
    address = filter[channel](address)
    let name = eval("`"+template+"`")
    let types = {
      phone: ['txt'],
      email: ['subject', 'txt', 'html']
    }
    let catalogService = await services.get('catalog')
    let content = await Promise.all(types[channel].map(type => catalogService({name, type},vars)))

    let notificationService = await services.get('notification')
    await notificationService[channel](address,...content)
  }
}
