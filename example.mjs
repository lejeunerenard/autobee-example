import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import Autobee from './index.mjs'
import readline from 'readline'
import b4a from 'b4a'

const args = process.argv.slice(2)
const storageDir = args[1] ?? './storage'

function addWriter (db, key) {
  return db.append({
    type: 'addWriter',
    key
  })
}

const store = new Corestore(storageDir)
const bootstrap = args[0]
console.log('bootstrap', bootstrap)

const db = new Autobee(store, bootstrap, {
  apply: async (batch, view, base) => {
    // Add .addWriter functionality
    for (const node of batch) {
      const op = node.value
      if (op.type === 'addWriter') {
        console.log('Adding writer', op.key)
        await base.addWriter(b4a.from(op.key, 'hex'))
        continue
      }
    }

    // Pass through to Autobee's apply
    await Autobee.apply(batch, view, base)
  },

  // Set encodings for autobase/hyperbee
  valueEncoding: 'json'
})
// Print any errors from apply() etc
  .on('error', console.error)

await db.update()

// List db on update
db.view.core.on('append', async () => {
  // Skip append event for hyperbee's header block
  if (db.view.version === 1) return

  console.log('current db key/value pairs')
  for await (const node of db.createReadStream()) {
    console.log('key', node.key)
    console.log('value', node.value)
    console.log()
  }
})

if (!bootstrap) {
  console.log('db.key', b4a.toString(db.key, 'hex'))
}

const swarm = new Hyperswarm()
swarm.on('connection', (connection, peerInfo) => {
  console.log('peer joined', b4a.toString(peerInfo.publicKey, 'hex').substring(0, 4))
  db.replicate(connection)
})

console.log('joining', b4a.toString(db.discoveryKey, 'hex'))
const discovery = swarm.join(db.discoveryKey)
await discovery.flushed()

console.log()
console.log('putting a key')

const simplePut = (db) => db.put(db.local.key, { message: 'was here', timestamp: new Date() })

if (db.writable) {
  await simplePut(db)
} else {
  console.log('db isnt writable yet')
  console.log('have another writer add the following key')
  console.log(b4a.toString(db.local.key, 'hex'))
}

// Setup add writer config
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log(`Enter db.keys to add as a writer.
Otherwise enter 'exit' to exit.`)
rl.on('line', async (line) => {
  if (!line) {
    rl.prompt()
    return
  }

  if (line === 'exit') {
    console.log('exiting')
    await db.close()
    process.exit(0)
  } else if (line === 'put') {
    await simplePut(db)
    rl.prompt()
    return
  }

  await addWriter(db, line)
  rl.prompt()
})
rl.prompt()
