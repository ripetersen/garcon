export async function init(services, config, globalConfig, __filename, __dirname) {
  for(let service_name of config.autostart) {
    await services.get(service_name)
  }
}
