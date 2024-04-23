import Autobase from 'autobase'
import b4a from 'b4a'
import Hyperbee from 'hyperbee'

export default class Autobee extends Autobase {
  constructor (store, bootstrap, handlers = {}) {
    if (bootstrap && typeof bootstrap !== 'string' && !b4a.isBuffer(bootstrap)) {
      handlers = bootstrap
      bootstrap = null
    }

    const open = (viewStore) => {
      const core = viewStore.get('autobee')
      return new Hyperbee(core, {
        ...handlers,
        extension: false
      })
    }

    const apply = 'apply' in handlers ? handlers.apply : Autobee.apply

    super(store, bootstrap, { ...handlers, open, apply })
  }

  static async apply (batch, view, base) {
    const b = view.batch({ update: false })
    // Decode operation node key if the Hyperbee view has a keyEncoding set & it
    // wasn't already decoded.
    const decodeKey = (x) => b4a.isBuffer(x) && view.keyEncoding
      ? view.keyEncoding.decode(x)
      : x

    // Process operation nodes
    for (const node of batch) {
      const op = node.value
      if (op.type === 'put') {
        const encKey = decodeKey(op.key)
        await b.put(encKey, op.value, op.opts)
      } else if (op.type === 'del') {
        const encKey = decodeKey(op.key)
        await b.del(encKey, op.opts)
      }
    }

    await b.flush()
  }

  _getEncodedKey (key, opts) {
    // Apply keyEncoding option if provided.
    // The key is preencoded so that the encoding survives being deserialized
    // from the input core
    const encKey = opts && opts.keyEncoding
      ? opts.keyEncoding.encode(key)
      : key

    // Clear keyEncoding from options as it has now been applied
    if (opts && opts.keyEncoding) {
      delete opts.keyEncoding
    }

    return encKey
  }

  put (key, value, opts) {
    return this.append({
      type: 'put',
      key: this._getEncodedKey(key, opts),
      value,
      opts
    })
  }

  del (key, opts) {
    return this.append({
      type: 'del',
      key: this._getEncodedKey(key, opts),
      opts
    })
  }

  get (key, opts) {
    return this.view.get(key, opts)
  }

  peek (opts) {
    return this.view.peek(opts)
  }

  createReadStream (range, opts) {
    return this.view.createReadStream(range, opts)
  }
}
