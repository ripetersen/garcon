import {jest} from '@jest/globals'
import util from '../src/util'

test('async foreach document', async () => {
  const a = [1,2,3,4];
  let s = '';
  await util.asyncForEach(a, (i) => Promise.resolve(s+=i));
  expect(s).toEqual('1234');
});

test('promiseForAll', async () => {
  const a = [1,2,3,4];
  let s = await util.promiseForAll(a, (i) => Promise.resolve(i+1));
  expect(s).toEqual([2,3,4,5]);
});

test('mask', () => {
  const o = {
    propertyA: 'A',
    propertyB: 'B',
    arrayA: ['itemA', 'itemB', 'itemC'],
    objectA: {
      propertyA: 'A',
      propertyB: 'B',
    },
    objectB: {
      propertyA: 'A',
      propertyB: 'B',
    },
    objectC: {
      propertyA: 'A',
      propertyB: 'B',
    }
  }
  const maskObject = {
    propertyA: '',
    arrayA: { 0: '', 2: ''},
    objectA: {
      propertyA: ''
    },
    objectB: ''
  }
  const expectedObject = {
    propertyA: 'A',
    arrayA: ['itemA', undefined, 'itemC'],
    objectA: {
      propertyA: 'A'
    },
    objectB: {
      propertyA: 'A',
      propertyB: 'B',
    }
  }

  expect(util.mask(o,maskObject)).toEqual(expectedObject)
})

test('randomDigits', () => {
  expect(util.randomDigits(5)).toEqual(expect.stringMatching(/\d{5}/))
})

test('randomLetters', () => {
  expect(util.randomLetters(12)).toEqual(expect.stringMatching(/[a-z]{12}/))
})


test('toBase', () => {
  expect(util.toBase( 123,'ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toEqual( 'ET')
  expect(util.toBase(-123,'ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toEqual('-ET')
})

test('toBase used custom negative sign', () => {
  expect(util.toBase( 123,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','!')).toEqual( 'ET')
  expect(util.toBase(-123,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','!')).toEqual('!ET')
})

test('toBase zero is zeroth character', () => {
  expect(util.toBase(0,'qwerty')).toEqual('q');
});

test('toBase adds padding', () => {
  expect(util.toBase( 123,'ABCDEFGHIJKLMNOPQRSTUVWXYZ', null, 10)).toEqual( 'AAAAAAAAET')
})

test('toBase matches ESscript', () => {
  expect(util.toBase( 22,'01')).toEqual(( 22).toString(2));
  expect(util.toBase(-22,'01')).toEqual((-22).toString(2));

  expect(util.toBase( 12981234,'01234567')).toEqual(( 12981234).toString(8));
  expect(util.toBase(-12981234,'01234567')).toEqual((-12981234).toString(8));

  expect(util.toBase( 19835,'0123456789abcdef')).toEqual(( 19835).toString(16));
  expect(util.toBase(-19835,'0123456789abcdef')).toEqual((-19835).toString(16));
})

test('fromBase', () => {
  expect(util.fromBase( 'ET','ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toEqual( 123n)
  expect(util.fromBase('-ET','ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toEqual(-123n)
})

test('fromBase used custom negative sign', () => {
  expect(util.fromBase( 'ET','ABCDEFGHIJKLMNOPQRSTUVWXYZ', '!')).toEqual( 123n)
  expect(util.fromBase('!ET','ABCDEFGHIJKLMNOPQRSTUVWXYZ', '!')).toEqual(-123n)
})

test('fromBase matches ESscript', () => {
  expect(util.fromBase(( 22).toString(2),'01')).toEqual( 22n);
  expect(util.fromBase((-22).toString(2),'01')).toEqual(-22n);

  expect(util.fromBase(( 12981234).toString(8),'01234567')).toEqual( 12981234n);
  expect(util.fromBase((-12981234).toString(8),'01234567')).toEqual(-12981234n);

  expect(util.fromBase(( 19853).toString(16),'0123456789abcdef')).toEqual( 19853n);
  expect(util.fromBase((-19853).toString(16),'0123456789abcdef')).toEqual(-19853n);
})

test('fromBase with padding', () => {
  expect(util.fromBase('AAAAAAAAET','ABCDEFGHIJKLMNOPQRSTUVWXYZ', '!')).toEqual( 123n)
})

test('fromBase throws on bad numbers', () => {
  expect(() => util.fromBase('ABC', 'ZXY')).toThrow();
})

describe('Time utilities', () => {
  const RealDate = Date.now

  beforeAll(() => {
    // now becomes 1554632430000
    global.Date.now = jest.fn(() => new Date('2019-04-07T10:20:30Z').getTime())
  })

  afterAll(() => {
    global.Date.now = RealDate
  })

  test('constants', () => {
    expect(util.time.second).toBe(1000);
    expect(util.time.s).toBe(1000);
    expect(util.time.minute).toBe(60000);
    expect(util.time.min).toBe(60000);
    expect(util.time.m).toBe(60000);
    expect(util.time.hour).toBe(3600000);
    expect(util.time.h).toBe(3600000);
    expect(util.time.day).toBe(86400000);
    expect(util.time.d).toBe(86400000);
    expect(util.time.week).toBe(604800000);
  })

  test('toHex', () => {
    expect(util.time.toHex()).toBe('00000169f75051b0')
  })

  test('toHex with given time', () => {
    expect(util.time.toHex(1612890309811)).toBe('0000017787c104b3')
  })

  test('fromHex', () => {
    expect(util.time.fromHex('0000017787c104b3')).toBe(1612890309811)
  })
})

describe('String utilities', () => {
  test('lpad', () => {
    expect(util.string.lpad('test', 10, '*')).toBe('******test')
  })

  test('lpad long string', () => {
    expect(util.string.lpad('this is a test', 10, '*')).toBe('this is a test')
  })

  test('digitsOnly', () => {
    expect(util.string.digitsOnly('123abc789')).toBe('123789')
  })

  test('equal', () => {
    expect(util.string.equal('abc','abc')).toBe(true)
  })

  test('equal different length', () => {
    expect(util.string.equal('abc','abcdef')).toBe(false)
  })

  test('equal different strings', () => {
    expect(util.string.equal('abc','dev')).toBe(false)
  })

  test('toHex', () => {
    const value = 'this is a test'
    const expectedValue = '7468697320697320612074657374'
    expect(util.string.toHex(value)).toBe(expectedValue)
  })

  test('fromHex', () => {
    const expectedValue = 'this is a test'
    const value = '7468697320697320612074657374'
    expect(util.string.fromHex(value)).toBe(expectedValue)
  })

  test('objToBase64URL', () => {
    const value = {
      string: 'a string¾  ?',
      number: 42,
      list: [ 1, 2, 3, 'four', 5 ],
      object: { test: 'test' }
    }
    const expectedValue = 'eyJzdHJpbmciOiJhIHN0cmluZ8K-ICA_IiwibnVtYmVyIjo0MiwibGlzdCI6WzEsMiwzLCJmb3VyIiw1XSwib2JqZWN0Ijp7InRlc3QiOiJ0ZXN0In19'

    expect(util.string.objToBase64URL(value)).toBe(expectedValue)
  })

  test('base64URLToObject', () => {
    const value = 'eyJzdHJpbmciOiJhIHN0cmluZ8K-ICA_IiwibnVtYmVyIjo0MiwibGlzdCI6WzEsMiwzLCJmb3VyIiw1XSwib2JqZWN0Ijp7InRlc3QiOiJ0ZXN0In19'
    const expectedValue = {
      string: 'a string¾  ?',
      number: 42,
      list: [ 1, 2, 3, 'four', 5 ],
      object: { test: 'test' }
    }
    expect(util.string.base64URLToObject(value)).toEqual(expectedValue)
  })

})


describe('File utilities', () => {
  test('stripExt', () => {
    expect(util.file.stripExt('file.exe','exe')).toBe('file.')
  })

  test('stripExt returns false', () => {
    expect(util.file.stripExt('file.exe','com')).toBe(false)
  })

  test('splitPathFile', () => {
    const path = '/foo/bar/fubar'
    const expected = {
      path: '/foo/bar',
      file: 'fubar'
    }
    expect(util.file.splitPathFile(path)).toEqual(expected)
  })

  test('splitPathFile no file', () => {
    const path = '/foo/bar/'
    const expected = {
      path: '/foo/bar',
      file: ''
    }
    expect(util.file.splitPathFile(path)).toEqual(expected)
  })

  test('splitPathFile no path', () => {
    const path = 'fubar'
    const expected = {
      path: '',
      file: 'fubar'
    }
    expect(util.file.splitPathFile(path)).toEqual(expected)
  })
})


describe('Buffer utilities', () => {
  const bytes = Buffer.from([
    141, 184, 126, 107, 104, 101,
    192,  25, 147,  87,  14, 223,
    124, 196, 255,  59,  49, 248])
  const expectedValue = 12345612312312312312312312312312312312312312n

  test('bigInt', () => {
    expect(util.buffer.bigInt(bytes)).toEqual(expectedValue)
  })

})

// TODO: remove duplicate test
describe('Combine objects', () => {
  test('combine two objects', () => {
    expect(
      util.combine( { foo:'bar', 'bar': 'foo' }, { foo:'baz' })
    ).toEqual(
      { foo: 'baz', bar: 'foo' }
    );
  });

  test('combine one object', () => {
    expect(
      util.combine( { foo:'bar', 'bar': 'foo' } )
    ).toEqual(
      { foo: 'bar', bar: 'foo' }
    );
  });

  test('combine 3 object', () => {
    expect(
      util.combine(
        { bar: 'foo', foo: 'bar' },
        { foo: { fu: 'baz' } },
        { foo: { bar: 'baz'} } )
    ).toEqual( {
      bar: 'foo',
      foo: { fu: 'baz', bar: 'baz'}
    } );
  });

  test('combine no objects', () => {
    expect( util.combine() ).toEqual({});
  });

  test('combine three objects', () => {
    expect(
      util.combine( { foo:'bar' }, {foo:'baz'}, { bar: 'foo' } )
    ).toEqual(
      { foo: 'baz', bar: 'foo' }
    );
  });

  test('combine append', () => {
    expect( util.combine( { a: [1,2]}, { 'a+': [3] } ) )
      .toEqual( { a: [1,2,3] } );
  });

  test('combine append new ', () => {
    expect( util.combine( { b: [1,2]}, { 'a+': [3] } ) )
      .toEqual( { b: [1,2], 'a+': [3] } );
  });

  test('append array', () => {
    expect(
      util.combine( { foo:[1,2,3] }, {'foo+':[4,5,6]} )
    ).toEqual(
      { foo: [ 1, 2, 3, 4, 5, 6 ] }
    );
  });

  test('prepend array', () => {
    expect(
      util.combine( { foo:[1,2,3] }, {'+foo':[4,5,6]} )
    ).toEqual(
      { foo: [ 4, 5, 6, 1, 2, 3 ] }
    );
  });

  test('set array element', () => {
    expect(
      util.combine( { foo:[1,2,3] }, {'foo[1]':6} )
    ).toEqual(
      { foo: [ 1, 6, 3 ] }
    );
  });

  test('delete key', () => {
    const first = {
      'fubar': 'snafu',
      'foo' : {
        'bar': 'baz'
      }
    }
    const second = {
      '-foo': ''
    }
    const expected = {
      'fubar': 'snafu'
    }
    expect(util.combine(first,second)).toEqual(expected)
  })

  test('combine complex objects', () => {
    expect(
      util.combine(
        { foo: { bar: 'baz', baz: 'foo' }, baz: 'foo' },
        { foo: { bar: 'bar' } }
      )
    ).toEqual(
      { foo: { bar: 'bar', baz: 'foo' }, baz: 'foo' },
    );
  });
});
