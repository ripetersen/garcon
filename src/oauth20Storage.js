import * as crypto from 'crypto'

/**
 * Implements storage of OAuth documents in Amazon DynamoDB
 */
export default class OAuth20Storage {
  /**
   *
   * @param {itemStore.ItemStore} client_store 
   * @param {itemStore.ItemStore} access_token_store 
   */
  constructor(client_store, access_token_store) {
    this.client_store = client_store
    this.client_store.key_property = 'client_id'
    this.access_token_store = access_token_store
    this.access_token_store.key_property = 'access_token_id'
  }

  createClient(object) {
    return this.client_store.add(object);
  }

  getClient(client_id) {
    return this.client_store.get(client_id);
  }

  deleteClient(client_id) {
    return this.client_store.delete(client_id);
  }

  insertAccessToken(access_token) {
    let access_token_id = crypto.createHash('sha256').update(access_token.access_token).digest('hex')
    return this.access_token_store.put(access_token_id,access_token);
  }

  getAccessTokenByCode(code) {
    return this.access_token_store.get(code)
  }

  getAccessToken(access_token) {
    let access_token_id = crypto.createHash('sha256').update(access_token.access_token).digest('hex')
    return this.access_token_connection.get(access_token_id);
  }

  deleteAccessToken(access_token) {
    let access_token_id = crypto.createHash('sha256').update(access_token.access_token).digest('hex')
    return this.access_token_connection.delete(access_token_id);
  }
}

