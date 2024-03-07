import {jest} from '@jest/globals'
import jab from '../src/jab'

afterEach(() => {
    jab.clear()
})

test('register object', () => {
    class A {}
    class B extends A {}
    class C extends B {}
    let c = new C()
    jab.register(c)
    expect(jab.objects.get(C)).toBe(c)
    expect(jab.objects.get(B)).toBe(c)
    expect(jab.objects.get(A)).toBe(c)
})

test('clear registry', () => { 
    class A {
        foo() {}
    }
    class B extends A {}
    jab.clear()
    expect(jab.objects.size).toBe(0)
    expect(jab.methods.size).toBe(0)
})   

test('inject class', () => {
    class A {}
    class B extends A {}
    class C extends B {}
    let c = new C()
    jab.register(c)
    expect(jab.inject(C)).toBe(c)
})

test('inject superclass', () => {
    class A {}
    class B extends A {}
    class C extends B {}
    let c = new C()
    jab.register(c)
    expect(jab.inject(A)).toBe(c)
})

test('inject overwritten superclass', () => {
    class A {}
    class B extends A {}
    class C extends B {}
    class D extends B {}
    let c = new C()
    let d = new D()
    jab.register(c)
    jab.register(d)
    expect(jab.inject(C)).toBe(c)
    expect(jab.inject(D)).toBe(d)
    expect(jab.inject(B)).toBe(d)
})

test('inject value', () => {
    expect(jab.inject(5)).toBe(5)
})

test('inject implementation', () => {
    class A {}
    class B extends A {}
    class C extends B {}
    let c = new C()
    let anotherC = new C()
    jab.register(c)
    expect(jab.inject(anotherC)).toBe(anotherC)
})

test('inject duck', () => {
    class Duck {
        quack() {}
        walk() {}
    }
    let duck = new Duck()
    jab.register(duck)

    class LeglessDuck {
        quack() {}
    }
    let leglessDuck = new LeglessDuck()
    jab.register(leglessDuck)

    class Dog {
        bark() {}
        walk() {}
    }
    let dog = new Dog()
    jab.register(dog)

    class Lion {
        roar() {}
        walk() {}
    }
    let lion = new Lion()
    jab.register(lion)
    
    let duck_type = new jab.Duck('quack', 'walk');
    expect(jab.inject(duck_type)).toBe(duck)
})

test('inject duck with no candidates', () => {
    class Duck {
        quack() {}
        walk() {}
    }
    let duck = new Duck()
    jab.register(duck)

    class Dog {
        bark() {}
        walk() {}
    }
    let dog = new Dog()
    jab.register(dog)

    let duck_dog = new jab.Duck('quack', 'bark');
    expect(() => jab.inject(duck_dog)).toThrow('No candidates found')
})

test('inject duck with multiple candidates', () => {
    class Duck {
        quack() {}
        walk() {}
    }
    let duck = new Duck()
    jab.register(duck)

    class Malard {
        quack() {}
        walk() {}
    }
    let malard = new Malard()
    jab.register(malard)

    let duck_type = new jab.Duck('quack', 'walk');
    expect(() => jab.inject(duck_type)).toThrow('Multiple candidates found')
});

test('inject duck ignore non-methods', () => {
    class Duck {
        quack() {}
        walk() {}
    }
    let duck = new Duck()
    duck.foo = 'bar'
    jab.register(duck)

    class Dog {
        bark() {}
        walk() {}
    }
    let dog = new Dog()
    jab.register(dog)

    let duck_bar = new jab.Duck('quack', 'bar');
    expect(() => jab.inject(duck_bar)).toThrow('No candidates found')
})
