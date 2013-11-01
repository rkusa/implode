var implode = require('../lib/implode')
  , should = require('should')
  , EventEmitter = require('events').EventEmitter
  , proxy = require('node-eventproxy')

describe('Function Proxy', function() {
  it('should be serializable and deserializable', function() {
    var obj = { fn: function() {} }
      , context = {}
    var prepared = implode({
      obj: obj,
      test: proxy(obj, 'fn', context, 1, 2)
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
      args.should.include(1, 2)
    }
  })

  it('should work using EventEmitter', function() {
    implode.register('EventEmitter', EventEmitter, ['_events'])
    var a = new EventEmitter
      , obj = { fn: function() {
        this.res = true
      } }
      , context = {}
    a.on('event1', proxy(obj, 'fn', { res: false }))
    var prepared = implode(a)
    var recovered = implode.recover(prepared)
    recovered.emit('event1')
    recovered._events.event1._proxied.context.res.should.be.ok
  })
})