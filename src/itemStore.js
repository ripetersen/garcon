/**
 * @module itemStore
 */

class ItemStore {
    constructor(key_property = 'id'){
        this.key_property = key_property;
    }

    /** 
     * Asynchronous initalization of the store
     */
    async init(key_property = 'id'){
        this.key_property = key_property;
    }
    
    /**
     * Get's the keys from the store
     */
    async keys(){}
    
    /**
     * Returns true if the key exists
     * @param {*} key 
     */
    async has(key){} 
    
    /**
     * Get's an item from the store using the key
     * @param {*} key 
     */
    async get(key){}
    
    /**
     * Puts an item into the store using the key.  If the value is not provided, 
     * the key is assumed to be a property of the value. The key is then extracted
     * from the value using the key_property property.
     * @param {*} key 
     * @param {*} value 
     */
    async put(key, value){}
    
    /**
     * Deletes an item from the store using the key
     * @param {*} key 
     */
    async delete(key){}

    /**
     * Initializes the store
     */
    async init(){}

    _get_key(value){
        let key = null;
        if(value.hasOwnProperty(this.key_property)) {
            key = value[this.key_property];
            if(typeof key == 'function') {
                key = key();
            }
        }
        return key;
    }
}

class MapItemStore extends ItemStore {
    constructor(key_property){
        super(key_property);
        this.map = new Map();
    }

    async keys(){
        return this.map.keys();
    }

    async has(key){
        return this.map.has(key);
    }
    
    async get(key){
        return this.map.get(key);
    }

    async put(key, value){
        if(value === undefined) {
            value = key;
            key = super._get_key(value);
        }
        this.map.set(key, value);
    }

    async delete(key) {
        return this.map.delete(key);
    }
}

class FileSystemItemStore extends ItemStore {
    constructor(dir, key_property){
        super(key_property);
        this.dir = dir;
    }

    async init(dir, key_property) {
        await super.init(key_property);
        this.fs = await import('fs/promises');
        this.dir = dir;
        try {
            await this.fs.access(this.dir);
        } catch {
            await this.fs.mkdir(this.dir, { recursive: true });
        }
    }

    async keys(){
        let files = await this.fs.readdir(this.dir);
        return files.map(f => f.split('.')[0]);
    }

    async has(key){
        let file = this.dir + '/' + key + '.json';
        try {
            await this.fs.access(file);
            return true;
        } catch {
            return false;
        }
    }
    
    async get(key){
        let file = this.dir + '/' + key + '.json';
        const value = await this.fs.readFile(file, 'utf8');
        return JSON.parse(value);
    }

    async put(key, value){
        if(value === undefined) {
            value = key;
            key = super._get_key(value);
        }
        let file = this.dir + '/' + key + '.json';
        await this.fs.writeFile(file, JSON.stringify(value), 'utf-8');
    }

    async delete(key) {
        let file = this.dir + '/' + key + '.json';
        await this.fs.unlink(file);
    }
}

export {ItemStore, MapItemStore, FileSystemItemStore};