
function isClass(value) {
    return typeof value === 'function' && /^\s*class\s+/.test(value.toString());
}

function isInstance(value) {
    return typeof value === 'object' && value.constructor && (typeof value.constructor == 'function') && value.constructor.name !== '';
}

function getClassChain(value) {
    const chain = [];
    let current = value;
    while (current && current.name && current.name !== '') {
        chain.push(current);
        current = Object.getPrototypeOf(current);
    }
    return chain;
}

function listMethods(obj) {
    let methods = new Set();
    let currentObj = obj;

    do {
        Object.getOwnPropertyNames(currentObj).forEach(prop => {
            if (typeof currentObj[prop] === 'function') {
                methods.add(prop);
            }
        });
        currentObj = Object.getPrototypeOf(currentObj);
    } while (currentObj && currentObj !== Object.prototype);

    return Array.from(methods).sort();
}

// Return the intersection of any number of sets
function intersect(...sets) {
    if (sets.length === 0) return new Set();
    if (sets.length === 1) return sets[0];

    // make a copy of the smallest set
    let sorted_sets = sets.sort((a, b) => a.size - b.size);
    let result = new Set(sorted_sets[0]);
    // remove any elements not in the other sets
    for( let item of result) {
        for (let i = 1; i < sorted_sets.length; i++) {
            if(!sorted_sets[i].has(item)) {
                result.delete(item);
            }           
            if(result.size === 0) return result;
        }
    }
    return result;
}

export class Duck {
    // Store a variable number of constructor arguments
    constructor(...args) {
        this.methods = args;
    }
}

export function register(value) {
    // if the value is an object, register it under all its class names
    if (isInstance(value)) {
        const chain = getClassChain(value.constructor);
        chain.forEach((name) => {
            jab.objects.set(name, value);
        });
        // register all methods of the object as an array 
        listMethods(value).forEach(method => {
            if(method === 'constructor') return;
            if(!jab.methods.has(method)) {
                jab.methods.set(method, new Set());
            } 
            jab.methods.get(method).add(value);
        });
    }
}

export function inject(value) {
    if(isClass(value)) {
        return jab.objects.get(value);
    } else if( value instanceof Duck) {
        const methods = value.methods.filter(m => jab.methods.has(m));
        if( methods.length !== value.methods.length ) {
            throw new Error('No candidates found');
        }
        const candidates = intersect(...methods.map(method => jab.methods.get(method)));
        if(candidates.size === 0) {
            throw new Error('No candidates found');
        }
        if(candidates.size > 1) {
            throw new Error('Multiple candidates found');
        }
        return candidates.values().next().value;
    }
    return value;
}

export function clear() {
    jab.objects.clear();
    jab.methods.clear();
}

const jab = {}
jab.clear = clear;
jab.methods = new Map();
jab.objects = new Map();
jab.register = register;
jab.inject = inject;
jab.Duck = Duck;
export default jab;