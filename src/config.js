'use strict';

import * as fs from 'fs';
import * as path from 'path';
import {combine} from './util.js'

/**
 * 
 * @param {string} name 
 * @returns {string[]}
 */
function getArg(name) {
    // Search the command line for the argument
  let config = process.argv.filter(e=>e.startsWith(name+'=')).map(e=>e.slice(1+name.length));
    // Search the environment for the argument
  if( config.length === 0 && name in process.env ) {
    config.push(process.env[name]);
  }
    // Search the environment for the argument in upper case
  if( config.length === 0 && name.toUpperCase() in process.env ) {
    config.push(process.env[name.toUpperCase()]);
  }

  return config;
}

/**
 *
 * @param {string|object} config 
 * @returns {object}
 */ 
function readConfig(config) {
    // If a string read from file
  let configuration = null;
  if( typeof(config)==="string" ) {
    // Check if the config file/directory exists
    if( !fs.existsSync(config) ) {
      throw new Error(`Configuration location, "${config}" does not exist`);
    }

    if( fs.statSync(config).isDirectory() ) {
      let dir = config
      configuration = {}
      for( let configName of fs.readdirSync(dir) ) {
        let configFile = path.join(dir, configName);
        if(
          !fs.statSync(configFile).isDirectory() &&
                    configName.endsWith(".json")
        ) {
          configName = configName.substring(0, configName.length - '.json'.length);
        }
        const childConfiguration = readConfig(configFile);
        if( childConfiguration != null ) {
          configuration[configName] = childConfiguration
        }
      }
    } else if ( config.endsWith('.json')) {
      console.debug("loading configuration from ",config)
      try {
        configuration = JSON.parse(fs.readFileSync(config));
      } catch(err) {
        console.error('Error processing config file',config,'\n',err)
      }
    }
  } else {
    configuration = config;
  }
  return configuration;
}

/**
 * Reads the configuration file "config" in the location "root"
 * @todo Refactor this function to accept a PATH and filename
 * @param {string|string[]} config
 * @returns {object}
 */
function create(config) {
  console.debug(`config.create(${config})`)
  if( !config ) {
    config = getArg('config');
    if( config.length === 0 ) {
      console.warn('No configuration location provided, using "config.json"');
      config = ['config.json'];
    }
  }
  if( !Array.isArray(config) ) {
    config = [config]
  }

    // reverse so that it behaves PATH like
  config.reverse()
  console.debug("config files:",config)
  let configurations = config.map(readConfig);
  configurations = combine(...configurations);

  const handler = {
        // root : root,
    get: function(o, p) {
      let v = null;
      if( p in o ) {
        v = o[p];
        if( typeof(v) === "object" ) {
          v = new Proxy(v,this);
        } else if( typeof(v) === 'string' ) {
          // Get a value from the environment
          if(v.startsWith('$$')) {
            v=v.substring(1);
          } else if(v.startsWith('$')) {
            if( v.substring(1) in process.env ) {
              v = process.env[v.substring(1)]
            }
          }
          // Get a value from a reference
          if(v.startsWith('@@')) {
            v=v.substring(1);
          } else if(v.startsWith('@')) {
            let saveV = v;
            v = v.substring(1);
            try {
              if(v.startsWith('[')) {
                v = eval("this.config"+v);
              } else {
                v = eval("this.config."+v);
              }
              if( v === undefined ||
                                v === null ) {
                v = saveV;
              }
            } catch(e) {
              v = saveV;
            }
          }
        }
      }/* else if (typeof(p) === "string" && ( p.endsWith('File') || p.endsWith('Dir'))) {
                let fileProp = p;
                if( p.endsWith('File') ) {
                    // propertyFile
                    fileProp = p.slice(0,p.length-4);
                } else {
                    // propertyDir
                    fileProp = p.slice(0,p.length-3);
                }
                if( fileProp in o ) {
                    v = o[fileProp];
                    if( !path.isAbsolute(v) ) {
                        v = path.join(this.root,v);
                    }
                }
            } */
      return v;
    }
  };
  handler.config = new Proxy( configurations, handler);
  return handler.config;
}

export default create
