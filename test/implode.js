var implode = require('../lib/implode')
  , should = require('should')

var User = function(name, password, roles) {
  var that = this;
  ['name', 'password', 'roles'].forEach(function(prop) {
    var value
    Object.defineProperty(that, prop, {
      get: function() { return value },
      set: function(val) { value = val },
      enumerable: true
    })
  })
  this.name = name
  this.password = password
  this.roles = roles
}
implode.register('Test/User', User, ['name', 'roles'])

var Role = function(name) {
  Object.defineProperty(this, 'name', {
    get: function() { return name },
    set: function(val) { name = val },
    enumerable: true
  })
}
implode.register('Test/Role', Role, ['name'])

var State = function() {}
implode.register('Test/State', State, ['roles', 'users', 'loggedInAs'])

var admin = new Role('Admin')
  , member = new Role('Member')
  , user = new User('Test', 'secret', [admin, member])
  , obj = new State
  , prepared, recovered
obj.trap = admin
obj.roles = [admin, member, new Role('Guest')]
obj.users = [user]
obj.users.type = User
obj.loggedInAs = user

var roles, users, loggedInAs
describe('implode', function() {
  before(function() {
    prepared = implode(obj)
    roles = prepared.obj.roles
    users = prepared.obj.users
    loggedInAs = prepared.obj.loggedInAs
    // console.log(prepared)
  })
  it('should stick to the contract', function() {
    should.not.exist(prepared.trap)
    for (var i = 0; i < 2; ++i)
      Object.keys(roles[i]).length.should.equal(2)
  })
  it('should prepare arrays', function() {
    roles.length.should.equal(3)
    users.length.should.equal(1)
    loggedInAs.obj.roles.length.should.equal(2)
  })
  it('should replicate properties', function() {
    roles[0].obj.name.should.equal('Admin')
    roles[1].obj.name.should.equal('Member')
    roles[2].obj.name.should.equal('Guest')
   loggedInAs.obj.name.should.equal('Test')
  })
  it('should add proper #$type', function() {
    for (var i = 0; i < 2; ++i)
      roles[i].$type.should.equal('Test/Role')
    loggedInAs.$type.should.equal('Test/User')
  })
  it('should resolve references', function() {
    loggedInAs.obj.roles[0].$ref.should.equal('#.roles.0')
    loggedInAs.obj.roles[1].$ref.should.equal('#.roles.1')
    users[0].$ref.should.equal('#.loggedInAs')
  })
  it('should resolve constructor references', function() {
    users.type.should.have.property('$obj', 'Test/User')
  })
})

describe('recover', function() {
  before(function() {
    recovered = implode.recover(prepared)
    roles = recovered.roles
    users = recovered.users
    loggedInAs = recovered.loggedInAs
  })
  it('should recover proper root instance', function() {
    recovered.should.be.an.instanceof(State)
    Object.keys(recovered).length.should.equal(3)
  })
  it('should recover arrays', function() {
    roles.length.should.equal(3)
    users.length.should.equal(1)
  })
  it('should recover items positions', function() {
    roles[0].name.should.equal(obj.roles[0].name)
    roles[1].name.should.equal(obj.roles[1].name)
    roles[2].name.should.equal(obj.roles[2].name)
  })
  it('should recover constructor instances', function() {
    roles.forEach(function(role) {
      role.should.be.instanceof(Role)
    })
    users[0].should.be.instanceof(User)
    loggedInAs.should.be.instanceof(User)
  })
  it('should recover references', function() {
    roles[0].should.equal(users[0].roles[0])
    roles[1].should.equal(users[0].roles[1])
    loggedInAs.should.equal(users[0])
  })
  it('should recover constructor references', function() {
    users.type.should.equal(User)
  })
  it('should keep array order', function() {
    obj.roles = obj.roles
    prepared = implode(obj)
    recovered = JSON.parse(JSON.stringify(prepared))
    recovered = implode.recover(prepared)
    roles = recovered.roles
    roles[0].name.should.equal(obj.roles[0].name)
    roles[1].name.should.equal(obj.roles[1].name)
    roles[2].name.should.equal(obj.roles[2].name)
  })
})
