var implode = require('../lib/implode')
  , should = require('should')
  , EventEmitter = require('events').EventEmitter
  , proxy = require('node-eventproxy')

proxy.enable(EventEmitter)

describe('Function Proxy', function() {
  it('should be serializable and deserializable', function() {
    var obj = { fn: function() {} }
      , context = {}
    var prepared = implode({
      obj: obj,
      test: proxy(obj, 'fn', context, 1, 2, proxy(obj, 'fn')),
      arr: []
    })
    with (prepared.test.$proxy) {
      target.should.have.property('$ref', '#.obj')
      method.should.equal('fn')
      context.should.equal(context)
      args.should.include(1, 2)
    }
    var recovered = implode.recover(prepared)
    with (recovered.test._proxied) {
      target.should.have.property('fn')
      method.should.equal('fn')
      context.should.equal(context)
      args.should.have.lengthOf(3)
      args.should.include(1, 2)
    }
  })

  it('should work using EventEmitter', function() {
    implode.register('EventEmitter', EventEmitter, ['_events'])
    var a = new EventEmitter
      , obj = { fn: function() {
        this.res = true
      } }
    a.on('event1', proxy(obj, 'fn', { res: false }))
    a.once('event2', proxy(obj, 'fn', { res: false }))
    var prepared = implode(a).toString()
    eval('prepared = ' + prepared)
    var recovered = implode.recover(prepared)
    recovered.emit('event1')
    recovered._events.event1._proxied.context.res.should.be.ok
    var context = recovered._events.event2.listener._proxied.context
    recovered.emit('event2')
    context.res.should.be.ok
    should.strictEqual(recovered._events.event2, undefined)
  })
})