import {EventEmitter} from 'events';

export default class AccountStorage extends EventEmitter {
  constructor(connection) {
    super()
    this.connection = connection
  }

  async connect() {
    await this.connection.connect()
    this.account_connection = this.connection.addItem({
      type: 'account',
      pk: ["account_id"],
      generate_pk: true
    })

    this.invite_connection = this.connection.addItem(
      this.connection.getItem('account'),
      {
        type: 'invite'
      }
    )

    this.login_connection = this.connection.addItem({
      type: 'login',
      pk: ['type','value']
    })
  }

  async close() {
    await this.connection.close();
  }

  async createAccount(login, password) {
    const account = {
      account_id: this.account_connection.generateId(),
      password: password,
      login: [this.login_connection.getKey(login)]
    }
    login.account = this.account_connection.getKey(account)

    // TODO: Use transactions
    await this.account_connection.add(account);
    await this.login_connection.add(login);
    return account;
    // account._update = { set: { login: [this.login_connection.getKey(login)] }}
    // this.account_connection.update(account)
  }

  /**
   * Adds a new login id to an existing account
   * @param account_id
   * @param {Object} login
   * @param {string} login.value - The value of the id
   * @param {string} login.type - The type of the id (email, phone, etc)
   */
  async addLogin(account_id, login) {
    const account = await this.getAccount(account_id)
    login.account = account
    await this.login_connection.add(login);
    account.login.push(this.login_connection.getKey(login))
    await this.account_connection.put(account)
  }

  getAccount(account_id) {
    return this.account_connection.get({account_id});
  }

  getAccountByKey(account_key) {
    return this.account_connection.getByKey(account_key);
  }

  getAccountKey(account) {
    return this.account_connection.getKey(account)
  }

  getAccountByLoginId(type, login) {
    return this.login_connection.get({type: type, value: login})
      .then( accountLogin => {
        return this.getAccountByKey(accountLogin.account)
      })
  }

  /**
   *
   * Returns true if the given login exists.
   * @param account_id
   * @returns {Promise<boolean>}
   */
  loginExists(login) {
    return this.login_connection.exists(login);
  }

  /**
   * corresponds to a mongo $set operator
   * @param {string} account_id
   * @param{Object} account_updates The fields and values to update
   * @param {Object} [] account_deletes The fields to delete
   * @returns {Promise<void>}
   */
  updateAccount(account_id,account_updates, account_deletes) {
    return this.account_connection.update({'account_id.value': account_id}, account_updates,account_deletes);
  }

  /**
   * corresponds to a mongo $unset operator
   * @param {String} account_id The id for the account
   * @returns {Promise<Boolean>}
   */
  async deleteAccount(account_id) {
    console.log('delete account '+account_id)
    const account = await this.getAccount(account_id)
    for(let login of account.login) {
      await this.login_connection.remove(login)
    }
    return !!(await this.account_connection.delete({account_id}));
  }
}
