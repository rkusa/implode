# implode

This library implodes complex Javascript objects preparing them to be serialized and later on deserialized. Supported structures:

* multiple references to the same object
* circular references
* functions (non-native and non-closure functions)
* constructors
* constructor instances

```json
{
  "name": "implode",
  "version": "1.1.4"
}
```

[![Build Status](https://secure.travis-ci.org/rkusa/implode.png)](http://travis-ci.org/rkusa/implode)

## Usage

```js
var implode    = require('implode')
var serialized = JSON.stringify(implode(obj)) // serialize
var recovered  = implode.recover(JSON.parse(serialized)) // deserialize
```

### Constructors

To use constructors, e.g.:

```js
var User = function(id, name) {
  this.id = id
  this.name = name
  
  // when being recovered, this constructor is called without arguments,
  // therefore the bootstrap logic is moved to a seperate method 
  this.init()
}

User.prototype.init = function() {
  this.excerpt = this.id + '-' + this.name
}

User.prototype.$deserialize = function(obj) {
  // this hook allows to postprocess the object when it got recovered
  obj.init()
  return obj
}

User.prototype.$serialize = function() {
  // this hook allows to preprocess the object for the implode process
  return this
}
```

... they have to be registered:

```js
implode.register(
  'User', // unique identifier
  User, // the constructor
  ['id', 'name'] // a whitelist of properties
)
```

## MIT License
Copyright (c) 2013 Markus Ast

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
