import {jest} from '@jest/globals'
// import the defualt export from the module
import JWTService from '../src/jwtService'

/*
test secret : m26ue13W-DHBvPQdDdBlcc0DSdX3nZGUMi3CIBay3Cs
test token  : https://jwt.io/#debugger-io?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.mWHGY-CJiniXxLp02iGH6WSNLgAnU_t9xJdeaQOTcfk
*/
const TEST_SECRET = 'm26ue13W-DHBvPQdDdBlcc0DSdX3nZGUMi3CIBay3Cs'
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.mWHGY-CJiniXxLp02iGH6WSNLgAnU_t9xJdeaQOTcfk'
const TEST_PAYLOAD = {
    "sub": "1234567890",
    "name": "John Doe",
    "iat": 1516239022
  }

test('get payload works', async () => {
    const secretStore = {
        get: () => {
            return TEST_SECRET
        }
    }
    let jwt = new JWTService(secretStore)
    let token = await jwt.getPayload(TEST_JWT)
    expect(token).toEqual(TEST_PAYLOAD)
})

test('invalid signature throws', () => {
    const secretStore = {
        get: () => {
            return TEST_SECRET
        }
    }
    let jwt = new JWTService(secretStore)
    let token = TEST_JWT.split('.')
    token[2] = 'invalid'
    token = token.join('.')
    expect(() => jwt.getPayload(token)).rejects.toEqual('Invalid signature')
})

test('invalid token type throws', () => {
    const secretStore = {
        get: () => {
            return TEST_SECRET
        }
    }
    let jwt = new JWTService(secretStore)
    // Token with typ="FOO" in header
    let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkZPTyJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.ygGJMEfmhAF1hQtGp5VKj_wVPE5QfqXztMKXwPSf-2Y'
    expect(() => jwt.getPayload(token)).rejects.toEqual('Invalid token type, expected JWT')
})

test('invalid algorithm throws', () => {
    const secretStore = {
        get: () => {
            return TEST_SECRET
        }
    }
    let jwt = new JWTService(secretStore)
    // Token with alg="FOO" in header
    let token = 'eyJhbGciOiJGT08iLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.ygGJMEfmhAF1hQtGp5VKj_wVPE5QfqXztMKXwPSf-2Y'
    expect(() => jwt.getPayload(token)).rejects.toEqual('Unsupported algorithm "FOO"')
})    

test('get token works', async () => {
    const secretStore = {
        get: () => {
            return TEST_SECRET
        }
    }
    let jwt = new JWTService(secretStore)
    let token = await jwt.getToken(TEST_PAYLOAD)
    expect(token).toEqual('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.FQCJhYWo57azxVNkl04HKw9FM7N2mQdM7fF0GMECr_k')
})