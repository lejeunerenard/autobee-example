import test from 'tape'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import Autobee from '../index.mjs'
import b4a from 'b4a'

test('basic usage', (t) => {
  t.test('defaults to use static apply method', async (t) => {
    const store = new Corestore(RAM)
    const db = new Autobee(store)
    t.equals(db._handlers.apply, Autobee.apply)
  })

  t.test('put', async (t) => {
    const store = new Corestore(RAM)
    const db = new Autobee(store, { valueEncoding: 'json' })
    await db.put('foo', 2)
    await db.put('bar', 'string')

    const fooNode = await db.get('foo')
    t.equals(fooNode.value, 2)

    const barNode = await db.get('bar')
    t.equals(barNode.value, 'string')
  })

  t.test('del', async (t) => {
    const store = new Corestore(RAM)
    const db = new Autobee(store, { valueEncoding: 'json' })
    await db.put('foo', 2)

    const fooNode = await db.get('foo')
    t.equals(fooNode.value, 2, 'foo\'s value set')

    await db.del('foo')

    const fooNodeAfter = await db.get('foo')
    t.equals(fooNodeAfter, null, 'foo was deleted')
  })

  t.test('peek', async (t) => {
    const store = new Corestore(RAM)
    const db = new Autobee(store, { valueEncoding: 'json' })
    await db.put('a', 3)
    await db.put('b', -1)

    const peekBeforeB = await db.peek({ lt: b4a.from('b') })
    t.equals(b4a.toString(peekBeforeB.key), 'a', 'node w/ key a found')
    t.equals(peekBeforeB.value, 3, 'a node had expected value')
  })

  t.test('createReadStream', async (t) => {
    const store = new Corestore(RAM)
    const db = new Autobee(store, { valueEncoding: 'json' })

    // Put Fibonacci numbers
    await db.put('a', 1)
    await db.put('b', 1)
    await db.put('c', 2)
    await db.put('d', 3)
    await db.put('e', 5)
    await db.put('f', 8)

    const prev = [0, 0]
    for await (const { value } of db.createReadStream({ lte: b4a.from('e') })) {
      if (value !== 1) {
        t.ok(value === prev[0] + prev[1], 'is next Fibonacci number')
      }

      // n-2 = n-1
      // n-1 = value
      prev.push(value)
      prev.shift()
    }

    t.deepEquals(prev, [3, 5], 'ended correctly')
  })
})
