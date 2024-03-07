import argon2 from 'argon2'

/**
 * Implements hashing functions using Argon2
 */
class Argon2AccountHash {
  constructor(config) {
    if( config === undefined ) {
      config = { };
    }
    if(!('type' in config)) {
      config.type = argon2.argon2id;
    }
    this.config = config;
  }

  async hash(password) {
    const hashedPassword = await argon2.hash(password,this.config);
    return hashedPassword
  }

  async check(hash,password) {
    return await argon2.verify(hash,password);
  }
}

const argon2AccountHash = function() { return new Argon2AccountHash(...arguments) };

export {argon2AccountHash as argon2}

/**
 * Implements a null hashing function, hash() always returns null, and check() always returns true
 **/
class NullAccountHash {
  hash() { return Promise.resolve(null); }
  check() { return Promise.resolve(true); }
}

const nullAccountHash = function() { return new NullAccountHash(...arguments) };

export {nullAccountHash as nullHash}
