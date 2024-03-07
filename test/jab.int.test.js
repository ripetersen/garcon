import {jest} from '@jest/globals'
import jab from '../src/jab'

afterEach(() => {
    jab.objects.clear()
})

test('inject constructor', () => {
    class Service {}
    let service = new Service()
    jab.register(service)
    class Client {
        constructor(service = jab.inject(Service)) {
            this.service = service
        }
    }
    let client = new Client()
    expect(client.service).toBe(service)
})
