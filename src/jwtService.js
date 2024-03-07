import crypto from 'crypto'
import { ItemStore } from './itemStore.js';

/**
 * @module jwtService
 */

function base64UrlEncode(source) {
    // Encode the string in Base64
    let encodedSource = Buffer.from(source).toString('base64');

    // Replace '+' with '-' and '/' with '_'
    encodedSource = encodedSource.replace(/\+/g, '-');
    encodedSource = encodedSource.replace(/\//g, '_');

    // Remove padding '=' characters
    encodedSource = encodedSource.replace(/=+$/, '');

    return encodedSource;
}

function base64urlDecode(encodedSource) {
    // Replace '-' with '+' and '_' with '/'
    encodedSource = encodedSource.replace(/-/g, '+');
    encodedSource = encodedSource.replace(/_/g, '/');

    // Add padding '=' characters
    while (encodedSource.length % 4) {
        encodedSource += '=';
    }

    // Decode the Base64 string
    let decodedSource = Buffer.from(encodedSource, 'base64').toString();

    return decodedSource;
}

const algorithms = {}
algorithms['HS256'] = (header, payload, secret) => {
    let signature = crypto.createHmac('sha256', secret)
        .update(header + '.' + payload)
        .digest('base64');
    // Replace '+' with '-' and '/' with '_'
    signature = signature.replace(/\+/g, '-');
    signature = signature.replace(/\//g, '_');

    // Remove padding '=' characters
    signature = signature.replace(/=+$/, '');        
    return signature;
}

export default class JWTService {
    constructor(secretStore) {
        this.secretStore = secretStore
    }

    /**
     * 
     * @param {ItemStore.ItemStore} secretStore 
     */
    setSecretStore(secretStore) {
        this.secretStore = secretStore
    }

    async getPayload(token_string) {
        const [header_b64, payload_b64, signature_b64] = token_string.split('.')
        const header = JSON.parse(base64urlDecode(header_b64))
        if (header['typ'] !== 'JWT') throw 'Invalid token type, expected JWT'
        if (!(header['alg'] in algorithms)) throw 'Unsupported algorithm "' + header['alg'] + '"'
        const payload = JSON.parse(base64urlDecode(payload_b64))
        const secret = await this.secretStore.get(payload['iss'])
        const signature = algorithms[header['alg']](header_b64, payload_b64, secret)
        if( signature_b64 != signature ) throw 'Invalid signature'
        return payload
    }

    async getToken(payload, header = {typ: 'JWT', alg: 'HS256'}) {
        const header_b64 = base64UrlEncode(JSON.stringify(header))
        const payload_b64 = base64UrlEncode(JSON.stringify(payload))
        const secret = await this.secretStore.get(payload['iss'])
        const signature_b64 = algorithms[header['alg']](header_b64, payload_b64, secret)
        return header_b64 + '.' + payload_b64 + '.' + signature_b64
    }
}

export {JWTService}