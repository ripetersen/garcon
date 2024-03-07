import * as crypto from 'crypto'
import * as stream from 'stream'

/**
 * Applies the function f to each element of array, awaiting for the function
 * in order.  You probably don't want this.  See promiseForAll.
 *
 * @param {Array} array of elements that are passed to f
 * @param {Function} f
 * @returns {Promise<void>}
 */
export async function asyncForEach(array, f) {
  for( let i=0; i<array.length; i++ ) {
    let p = f(array[i]);
    await p;
  }
}

/**
 * Maps each element of the array to function f (which should be async or return a promise).
 * Returns the Promise from Promise.all() for the mapped array and function.
 *
 * @param {Array} array of elements to map to f
 * @param {Function} f
 * @returns {Promise<void>}
 */
export function promiseForAll(array, f) {
  return Promise.all( array.map( elem => f(elem)));
}

export function mask(obj, maskObject) {
  const result = Array.isArray(obj) ? [] : {}
  for( let key of Object.keys(maskObject) ) {
    if( key in obj ) {
      if( typeof(obj[key]) === 'object' &&
        typeof(maskObject[key]) === 'object' ) {
        result[key] = mask(obj[key],maskObject[key])
      } else {
        result[key] = obj[key]
      }
    }
  }
  return result;
}

/**
 * Combines objects together, objects are passed from lowest to highest
 * precedence.  I.E. the last object passed will overwrite the first.
 * 
 * The function combines recursively, so if a key in the first object
 * maps to an object and the same key in the second object also maps to 
 * an object, the those two objects are combined.
 * 
 * 
 * @example
 * combine( { bar: 'foo', foo: 'bar' }, { foo: 'baz' } )
 * // returns {bar: 'foo', foo: 'baz'}
 * @param {...object} The objects to combine
 **/
export function combine(...args) {
  return args.length == 0 ? {} : args.reduce(
    (first, second) => {
      for( let key of Object.keys(second) ) {
        if( key in first &&
          typeof(first[key])  == 'object' &&
          typeof(second[key]) == 'object' ) {
          first[key] = combine(first[key], second[key]);
        } else {
          let appendKey = key.endsWith('+') ? key.substring(0, key.length - 1) : null;
          let prependKey = key.startsWith('+') ? key.substring(1) : null;
          let deleteKey = key.startsWith('-') ? key.substring(1) : null;
          // foo[1]
          // ^   ^--- index
          // \------- key
          let arrayKey = key.match( /(?<key>^[^[]*)\[(?<index>\d+)\]/ );

          if( deleteKey &&
            deleteKey in first ) {
            delete first[deleteKey]
          } else if( appendKey &&
            appendKey in first &&
            Array.isArray(first[appendKey]) ) {
            first[appendKey] = first[appendKey].concat(second[key]);
          } else if ( prependKey &&
            prependKey in first &&
            Array.isArray(first[prependKey]) ) {
            first[prependKey] = second[key].concat(first[prependKey]);
          } else if ( arrayKey &&
            arrayKey.groups.key in first &&
            Array.isArray(first[arrayKey.groups.key]) ) {
            first[arrayKey.groups.key][arrayKey.groups.index] = second[key];
          } else {
            first[key] = second[key];
          }
        }
      }
      return first;
    }, {});
}

export function randomDigits(length) {
  return randomString(length, '0123456789');
}

export function randomLetters(length) {
  return randomString(length, 'abcdefghijklmnopqrstuvwxyz');
}

export function randomString(length, alphabet) {
  let o='';
  while(o.length<length) {
    o=o+alphabet[Math.floor(alphabet.length*Math.random())]
  }
  return o;
}

export function toBase(n, alphabet, negativeSign, width) {
  if( n == 0 ) {
    return alphabet[0];
  }
  if( negativeSign == undefined ) negativeSign = '-'
  n = BigInt(n)
  let negative = n < 0;
  if( negative ) {
    n = -n
  }
  let s = ''
  let alphabetLength = BigInt(alphabet.length)
  while( n>0 ) {
    const digit = n%alphabetLength;
    s = alphabet[digit] + s;
    n = n/alphabetLength
  }
  if( width ) {
    while( s.length<width ) {
      s = alphabet[0] + s
    }
  }
  s = (negative ? negativeSign : '') + s;
  return s;
}

export function fromBase(s, alphabet, negativeSign) {
  if( negativeSign === undefined ) negativeSign = '-'
  let base = BigInt(alphabet.length);
  let power = BigInt(0);
  s = s.split('');
  let n = BigInt(0);
  while( s.length > 0 ) {
    const char = s.pop();
    const v = alphabet.indexOf(char);
    if( v > -1 ) {
      n += base ** power * BigInt(v);
    } else if ( v==-1 && s.length==0 && char==negativeSign ) {
      n = -n;
    } else {
      throw `Illegal character ${char} found in number with base ${alphabet}`;
    }
    power++;
  }
  return n;
}

export const time = {}
time.second = 1000;
time.s    = time.second;
time.minute = 60 * time.s;
time.min  = time.minute;
time.m    = time.minute;
time.hour   = 60 * time.m;
time.h    = time.hour;
time.day  = 24 * time.h;
time.d    = time.day;
time.week   = 7 * time.day;
time.toHex = (t) => (typeof(t) == "number" ? t : Date.now()).toString(16).padStart(16,0)
time.fromHex = (hexTime) => parseInt(hexTime, 16)

export const string = {}
string.lpad = function(str, len, char) {
  if( str.length >= len ) return str;
  while( str.length<len ) str = char + str;
  return str;
}

string.digitsOnly = function(value) {
  return value.split('').reduce( (digits, c) => digits + (isNaN(parseInt(c)) ? '' : c), '');
}

/** A constant-time string comparison **/
string.equal = function(a,b) {
  if( a.length != b.length ) return false;

  let result = 0;
  for( let n=0; n<a.length; n++) {
    result |= a.charCodeAt(n) ^ b.charCodeAt(n)
  }
  return result === 0
}

string.toHex = function(str) {
  return (new TextEncoder()).encode(str).reduce( (s,b) => s+b.toString(16), '');
}

string.fromHex = function(hex) {
  const uia = new Uint8Array(hex.length / 2);
  for( let n=0; n<hex.length; n+=2 ) {
    uia[n/2] = parseInt(hex.substr(n,2), 16);
  }
  return (new TextDecoder()).decode(uia);
}

string.objToBase64URL = function(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .split('')
    .map( c => c == '+' ? '-' : c == '/' ? '_' : c )
    .filter( c => c!='=' )
    .join('')
}

const b64Padding = ['', '=', '==', '===']
string.base64URLToObject = function(str) {
  return JSON.parse(Buffer.from(str + b64Padding[str.length % 4], 'base64'))
}

string.templatePromise = async function(strings, ...expressions) {
  let values = await Promise.all(expressions);
  return strings.reduce( (result,str,i) => result+values[i-1]+str )
}

const fileUtil = {}
export {fileUtil as file}
fileUtil.stripExt = (filename,ext) => filename.endsWith(ext) ?
  filename.substring(0,filename.length - ext.length) : false;

fileUtil.splitPathFile = function(filename) {
  const ndx = filename.lastIndexOf('/')
  return ndx === -1
    ? {
      path: '',
      file: filename
    }
    : {
      path: filename.slice(0,ndx),
      file: filename.slice(ndx+1)
    }
}

const objectUtil = {}
export {objectUtil as object}
objectUtil.stringify = function(value, replacer) {
  switch(typeof(value)) {
    case 'string':
    case 'boolean':
    case 'number':
      return JSON.stringify(value)
    case 'undefined':
      return 'null'
    case 'object':
      if(value==null) return null
      if(Array.isArray(value)) {
        let str = '['
        for(let n=0; n<value.length; n++) {
          str = str + objectUtil.stringify(value[n]) + (n<value.length-1 ?',':'')
        }
        str = str + ']'
        return str
      }
      {
        let str = '{'
        let keys = Object.keys(value).sort()
        for(let n=0; n<keys.length; n++) {
          const key = keys[n]
          let keyValue = value[key]
          if(typeof(replacer)==='function') {
            keyValue = replacer.call(value, key, keyValue)
          }
          if(keyValue===undefined) continue
          str = str + JSON.stringify(key) + ":" + objectUtil.stringify(keyValue) + (n<keys.length-1 ?',':'')
        }
        str = str + '}'
        return str
      }
    default:
      throw new TypeError('Unknown type '+typeof(value))
  }
}

objectUtil.hash = function(obj, replacer, algorithm='sha256') {
  const value = objectUtil.stringify(obj, replacer)
  const msgBuffer = new TextEncoder('utf-8').encode(value);
  const hash = crypto.createHash(algorithm)
  hash.update(msgBuffer)
  return hash.digest('hex')
}

const objRegEx = /'(?:[^\\']|\\.)+'|"(?:[^\\"]|\\.)+"|(?:[^.[\]])+/g;

objectUtil.has = function(obj, key) {
  let k;
  let hasKey = true
  const keys = key.match(objRegEx)
    .map( k => (k[0]=="'" || k[0]=='"') ? k.substr(1,k.length-2) : k)
    .map(k=>k.replace("\\'","'").replace('\\"','"'))
  while(hasKey && obj!=null && keys.length>0) {
    k = keys.shift()
    hasKey = k in obj
    obj = obj[k]
  }
  return hasKey
}

objectUtil.get = function(obj, key) {
  let k;
  const keys = key.match(objRegEx)
    .map( k => (k[0]=="'" || k[0]=='"') ? k.substr(1,k.length-2) : k)
    .map(k=>k.replace("\\'","'").replace('\\"','"'))
  while(obj!=null && keys.length>0) {
    k = keys.shift()
    obj = obj[k]
  }
  return obj
}

objectUtil.set = function(obj, key, value) {
  let k, pk, po;
  const keys = key.match(objRegEx)
    .map( k => (k[0]=="'" || k[0]=='"') ? k.substr(1,k.length-2) : k)
    .map(k=>k.replace("\\'","'").replace('\\"','"'))
  while(keys.length>0) {
    pk = k
    k = keys.shift()
    if(
      po != null &&
      pk!=null &&
      !Array.isArray(obj) &&
      Object.keys(obj).length==0 &&
      /^\d+$/.test(k)) {
      obj = []
      po[pk] = obj
    }

    if(keys.length==0) {
      obj[k] = value
    } else if(!(k in obj)) {
      obj[k] = {}
    }
    po = obj
    obj = obj[k]
  }
}


const streamUtil = {}
export {streamUtil as stream}
streamUtil.info = function(algorithm='sha256') {
  var info = new stream.Transform()
  info._hash = crypto.createHash(algorithm)
  info._size = 0
  info._transform = function(chunk, encoding, done) {
    this._hash.update(chunk)
    this._size += 'size' in chunk ? chunk.size : chunk.length
    this.push(chunk)
    done()
  }
  return info
}

const bufferUtil = {}
export {bufferUtil as buffer}
bufferUtil.bigInt = (buf) => buf.reduce( (bi,b) => (bi << BigInt(8)) | BigInt(b), BigInt(0) )

const util = {}
util.asyncForEach = asyncForEach
util.promiseForAll = promiseForAll
util.mask = mask
util.combine = combine
util.randomDigits = randomDigits
util.randomLetters = randomLetters
util.randomString = randomString
util.toBase = toBase
util.fromBase = fromBase
util.time = time
util.string = string
util.file = fileUtil
util.object = objectUtil
util.stream = streamUtil
util.buffer = bufferUtil
export default util
