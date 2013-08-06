var contracts = {}

var implode = module.exports = function(obj) {
  var queue = []
    , referenced = []
  function traverse(val, path) {
    switch (typeof val) {
      case 'object':
        // get rid of builtin objects
        // and consider that typeof null === 'object'
        if (val === null ||
            val instanceof Boolean ||
            val instanceof Date ||
            val instanceof Number ||
            val instanceof RegExp ||
            val instanceof String) {
          return val
        }

        // already encountered? if so, return a reference
        if (val.hasOwnProperty('$path')) {
          // follow path to check its existence to prepend
          // errors from obsolete $path properties
          try {
            var pos = { '#': obj }    
            val.$path.split('.').forEach(function(part) {
              pos = pos[part]
            })
            if (pos !== undefined)
              return { $ref: val.$path }
          } catch(e) {}
        }
            
        // otherwise mark as encountered and append its path
        Object.defineProperty(val, '$path', {
          value: path.join('.'),
          configurable: true
        })
        referenced.push(val)
          
        // so it is an array or an object
        var copy = Array.isArray(val) ? [] : {}
        
        // if the object contains a $contract, stick to it
        if ('$contract' in val) {
          var contract = val.$contract
          copy = {
            $type: contract.id,
            obj: {}
          }
          
          // preprocess the object with the
          // $serialize method if existent
          if ('$serialize' in val)
            val = val.$serialize()
          if (val === null)
            return null
          
          // stick to the contract
          contract.forEach(function(prop) {
            queue.push((function (path) {
              copy.obj[prop] = traverse(val[prop], path)
            }).bind(null, path.concat(prop)))
          })
          
          // additionally if it is an array,
          // take its items too
          if (Array.isArray(val)) {
            copy.arr = []
            for (var i = 0; i < val.length; ++i) {
              queue.push((function (path, i) {
                copy.arr[i] = traverse(val[i], path)
              }).bind(null, path.concat(i), i))
            }
          }
        // otherwise, copy and traverse its items
        } else {
          for (var i in val) {
            queue.push((function (path, i) {
              copy[i] = traverse(val[i], path)
            }).bind(null, path.concat(i), i))
          }
        }
        
        // done
        return copy
      case 'function':
        // if its prototype contains a $contract, return a reference
        if (val.prototype && val.prototype.hasOwnProperty('$contract')) {
          return { $obj: val.prototype.$contract.id }
        } else {
          var fn = { $fn: val.toString(), keys: {} }
          for (var i in val) {
            queue.push((function (path, i) {
              fn.keys[i] = traverse(val[i], path)
            }).bind(null, path.concat(i), i))
          }
          return fn
        }
      default:
        // do nothing
        return val
    }
  }
  var result = traverse(obj, ['#']), q, ref
  while ((q = queue.shift())) q()
  while ((ref = referenced.shift())) delete ref['$path']
  return result
}

implode.register = function(id, obj, contract) {
  if (contracts[id]) console.warn('contract id %s already taken', id)
  contracts[id] = obj
  contract.id = id
  Object.defineProperty(obj.prototype, '$contract', {
    value: contract
  })
}

implode.recover = function(obj) {
  // reference to the root of the new object
  // for reference resolving
  var root, queue = [], q
  
  function traverse(val, ident, parent) {
    // no object = nothing to do
    if (typeof val !== 'object' || val === null) {
      if (!parent) return val
      if (ident === undefined) parent.push(val)
      else parent[ident] = val
      return val
    }
    
    var copy
      
    // if it is a reference, resolve it
    if ('$ref' in val) {
      // follow path
      var pos = root
      val.$ref.split('.').forEach(function(part) {
        pos = pos[part]
      })
      
      copy = pos
    // if it is a reference to a class, resolve it
    } else if ('$obj' in val) {
      copy = contracts[val.$obj]
    }
    
    if (copy) {
      if (ident === undefined) parent.push(copy)
      else parent[ident] = copy
      return copy
    }
    
    if ('$fn' in val) {
      eval('copy = ' + val.$fn)
      val = val.keys
    }
    // if it is a class, rebuild it
    else if ('$type' in val) {
      // create new instance appropriated instance
      copy = new contracts[val.$type]
      if ('arr' in val) {
        var obj = val.obj
        val = val.arr
        Object.keys(obj).forEach(function(key) {
          val[key] = obj[key]
        })
      } else {
        val = val.obj
      }
        
      delete val.$type
    // otherwise, it is an array or an object
    } else {
      copy = /* parent[ident] ||*/ (Array.isArray(val) ? [] : {})
    }
    
    // if parent not set, its the root obj
    if (parent && ident === undefined) parent.push(copy)
    else if (parent) parent[ident] = copy
    
    if (Array.isArray(val)) {
      var item
      while ((item = val.shift())) {
        queue.push((function(item) {
          traverse(item, undefined, copy)
        }).bind(null, item))  
      }
    }
    
    // copy and traverse its items
    for (var i in val) {
      queue.push((function(i) {
        traverse(val[i], i, copy)
      }).bind(null, i))  
    }
          
    // postprocess the object with the
    // $deserialize method if existent
    if ('$deserialize' in copy) {
      queue.push((function(copy) {
        copy = copy.$deserialize(copy)
      }).bind(null, copy))
    }
    
    // done   
    return copy
  }

  root = { '#': traverse(obj, null, null) }
  while ((q = queue.shift())) q()
  
  return root['#']
}