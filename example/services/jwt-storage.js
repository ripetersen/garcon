import { FileSystemItemStore } from 'garcon/itemStore';
const itemStore = new FileSystemItemStore();

export async function init(services, config, globalConfig, __filename, __dirname) {
  itemStore.init(config['dir'])
}

export {itemStore as provider}
