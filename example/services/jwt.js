import JWTService from 'garcon/jwtService';
const jwtService = new JWTService();

export async function init(services, config, globalConfig, __filename, __dirname) {
  // @Type {itemStore.ItemStore}
  const storage = await services.get('jwt-storage')
  jwtService.setSecretStore(storage)
}

export {jwtService as provider}
