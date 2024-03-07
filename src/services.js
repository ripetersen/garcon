import * as path from 'path'
import { access } from 'fs/promises';
import { constants } from 'fs';

export class Services {
  constructor() {
    this.services = new Map()
    this.serviceTerminators = []
    this.path = []
  }

  async _serviceFile(serviceName) {
    var serviceFile
    for(let d of this.path) {
      serviceFile = path.resolve(path.join(d,serviceName+'.js'))
      try {
	// return the first readable file
        await access(serviceFile, constants.R_OK )
        break;
      } catch {} // eslint-disable-line no-empty
    }
    return serviceFile
  }

  async init(config, servicePath) {
    this.services.set('config', config)
    if( !Array.isArray(servicePath) ) {
      servicePath = [servicePath]
    }
    this.path = servicePath
    if(this.hasService('_autostart')) {
      await this.loadService('_autostart')
    }
  }

  async hasService(serviceName) {
    if( !this.path || !this.services.has('config') ) {
      throw new Error("Services not initialized")
    }
    const serviceFile = await this._serviceFile(serviceName, false)
    try {
      await access(serviceFile, constants.F_OK)
    } catch {
      return false
    }
    return true
  }

  async loadService(serviceName, required=true) {
    if( !this.path || !this.services.has('config') ) {
      throw new Error("Services not initialized")
    }
    const serviceFile = await this._serviceFile(serviceName)
    console.debug(`Starting ${serviceName} service from ${serviceFile}`)
    try {
      await access(serviceFile, constants.F_OK)
    } catch {
        throw new Error(`Service file not found: ${serviceFile}`)
    }
    const config = this.services.get('config')
    // TODO: a logging method that can obfuscate keys, secrets, passwords ect based on property name
    // console.log(`${serviceName} configuration:`)
    // console.log(JSON.stringify(config[serviceName]))
    try {
      const service = await import(serviceFile)
      if('init' in service) await service.init(this, config[serviceName], config, serviceFile, this.dir)
      if('stop' in service) this.serviceTerminators.push([serviceName, service.stop])
      if('provider' in service) this.services.set(serviceName, service.provider)
    } catch (e) {
      const err = new Error('Service Createion Error')
      err.serviceFile = serviceFile
      err.rootCause = e
      throw err
    }
  }

  async get(serviceName) {
    if( !this.services.has(serviceName) ) {
      console.log(`Loading service ${serviceName}`);
      try {
        await this.loadService(serviceName)
      } catch(e) {
        if(e.serviceFile) {
          console.error(`Error loading service ${serviceName} from ${e.serviceFile}`,e)
          throw e.rootCause
        }
        throw e
      }
    }
    return this.services.get(serviceName)
  }

  async stop() {
    console.log('Stoping services...');
    let errorCount = 0;
    for( let terminator of this.serviceTerminators ) {
      try {
        await terminator[1]()
      } catch(err) {
        errorCount++;
        console.error('Error terminating ', terminator[0], ' service\n', err);
      }
    }
    console.log(`All services stoped with ${errorCount} errors.`);
  }
}

const services =  new Services()
export default services
