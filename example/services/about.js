const about = {};

export async function init(services, config, globalConfig, __filename, __dirname) {
  Object.assign(about,config)
}

export {about as provider}
