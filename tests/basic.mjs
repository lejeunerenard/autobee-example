import test from 'tape'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import SubEncoder from 'sub-encoder'
import Autobee from '../index.mjs'
import b4a from 'b4a'
import Hyperbee from 'hyperbee'
import { replicateAndSync } from 'autobase-test-helpers'
import c from 'compact-encoding'

test('basic usage', (t) => {
  t.test('defaults to use static apply method', async (t) => {
    const store = new Corestore(RAM)
    const db = new Autobee(store)
    t.equals(db._handlers.apply, Autobee.apply)
  })

  t.test('put', (t) => {
    t.test('basic', async (t) => {
      const store = new Corestore(RAM)
      const db = new Autobee(store, { valueEncoding: 'json' })
      await db.put('foo', 2)
      await db.put('bar', 'string')

      const fooNode = await db.get('foo')
      t.equals(fooNode.value, 2)

      const barNode = await db.get('bar')
      t.equals(barNode.value, 'string')
    })

    t.test('w/ opts', (t) => {
      t.test('w/o keyEncoding on hyperbee', async (t) => {
        const store = new Corestore(RAM)
        const subEnc = new SubEncoder('beep')
        const db = new Autobee(store, { valueEncoding: 'json' })
        await db.put('foo', 2, { keyEncoding: subEnc })

        const fooNodeNoEnc = await db.get('foo')
        t.equals(fooNodeNoEnc, null)

        const fooNodeEnc = await db.get('foo', { keyEncoding: subEnc })
        t.equals(fooNodeEnc.value, 2)
      })
    })
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

  t.test('peek', (t) => {
    t.test('w/o keyEncoding', async (t) => {
      const store = new Corestore(RAM)
      const db = new Autobee(store, { valueEncoding: 'json' })
      await db.put('a', 3)
      await db.put('b', -1)

      const peekBeforeB = await db.peek({ lt: b4a.from('b') })
      t.equals(b4a.toString(peekBeforeB.key), 'a', 'node w/ key a found')
      t.equals(peekBeforeB.value, 3, 'a node had expected value')
    })

    t.test('w/ keyEncoding', async (t) => {
      const store = new Corestore(RAM)
      const db = new Autobee(store, { keyEncoding: 'json', valueEncoding: 'json' })
      await db.put('a', 3)
      await db.put('b', -1)

      const peekBeforeB = await db.peek({ lt: b4a.from('b') })
      t.equals(peekBeforeB.key, 'a', 'node w/ key a found')
      t.equals(peekBeforeB.value, 3, 'a node had expected value')
    })
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

  t.test('keyEncoding support', (t) => {
    t.test('on hyperbee', async (t) => {
      const customEncoding = {
        encode: (key) => {
          return b4a.from(key.key)
        },
        decode: (buf) => {
          return { key: b4a.from(buf) }
        }
      }

      const store = new Corestore(RAM)
      const db = new Autobee(store, { keyEncoding: customEncoding, valueEncoding: 'json' })

      const testCore = store.get({ name: 'test-core' })
      const bee = new Hyperbee(testCore, { keyEncoding: customEncoding, valueEncoding: 'json' })
      await bee.ready()

      const runGambit = async (bee, t) => {
        await bee.put({ key: 'foo' }, 2)

        const fooNodeEnc = await bee.get({ key: 'foo' })
        t.equals(fooNodeEnc.value, 2)

        const bufferKey = b4a.from('deadbeef', 'hex')
        await bee.put({ key: bufferKey }, 3)

        const bufferkeyNode = await bee.get({ key: bufferKey })
        t.equals(bufferkeyNode.value, 3)
      }

      // Run against Hyperbee
      await runGambit(bee, t)
      // Run Against Autobee
      await runGambit(db, t)
    })

    t.test('.put()', async (t) => {
      const store = new Corestore(RAM)
      const customEncoding = {
        encode: (key) => {
          return b4a.from(key.key)
        },
        decode: (buf) => {
          return { key: b4a.from(buf) }
        }
      }

      const subEnc = new SubEncoder('beep', customEncoding)
      const db = new Autobee(store, { keyEncoding: customEncoding, valueEncoding: 'json' })

      const testCore = store.get({ name: 'test-core' })
      const bee = new Hyperbee(testCore, { keyEncoding: customEncoding, valueEncoding: 'json' })
      await bee.ready()

      const runGambit = async (bee, t) => {
        await bee.put({ key: 'foo' }, 2, { keyEncoding: subEnc })

        const fooNodeEnc = await bee.get({ key: 'foo' }, { keyEncoding: subEnc })
        t.equals(fooNodeEnc.value, 2)

        const bufferKey = b4a.from('deadbeef', 'hex')
        await bee.put({ key: bufferKey }, 3, { keyEncoding: subEnc })

        const bufferkeyNode = await bee.get({ key: bufferKey }, { keyEncoding: subEnc })
        t.equals(bufferkeyNode.value, 3)
      }

      // Run against Hyperbee
      await runGambit(bee, t)
      // Run Against Autobee
      await runGambit(db, t)
    })
  })

  t.test('replication', async (t) => {
    const store = new Corestore(RAM.reusable())
    const db = new Autobee(store, null, {
      apply: applyWithAddWriter,
      valueEncoding: c.any
    })
    await db.ready()

    const store2 = new Corestore(RAM.reusable())
    const db2 = new Autobee(store2, db.key, {
      apply: applyWithAddWriter,
      valueEncoding: c.any
    })

    await db2.ready()

    await addWriter(db, db2.local.key)

    await db.put('foo', 2)
    await db.put(b4a.from('bar'), 'string')

    await replicateAndSync([db, db2])

    const fooNode = await db2.get('foo')
    t.equals(fooNode.value, 2)

    const barNode = await db2.get(b4a.from('bar'))
    t.equals(barNode.value, 'string')

    await db.close()
    await db2.close()
  })
})

function addWriter (db, key) {
  return db.append({
    type: 'addWriter',
    key
  })
}

async function applyWithAddWriter (batch, view, base) {
  const debug = false
  // Add .addWriter functionality
  for (const node of batch) {
    const op = node.value
    if (op.type === 'addWriter') {
      debug && console.log('\rAdding writer', op.key)
      await base.addWriter(b4a.from(op.key, 'hex'))
      continue
    }
  }

  // Pass through to Autobee's apply
  await Autobee.apply(batch, view, base)
}
