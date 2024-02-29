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

    // Process operation nodes
    for (const node of batch) {
      const op = node.value
      if (op.type === 'put') {
        await b.put(b4a.from(op.key), op.value, op.opts)
      } else if (op.type === 'del') {
        await b.del(b4a.from(op.key), op.opts)
      }
    }

    await b.flush()
  }

  put (key, value, opts) {
    return this.append({
      type: 'put',
      key,
      value
    })
  }

  del (key, opts) {
    return this.append({
      type: 'del',
      key,
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
