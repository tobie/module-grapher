var errors = require('./errors');

exports.createModule = createModule;
exports.create = createModule;
function createModule(ident, options) {
  return new Module(ident, options);
}

exports.Module = Module;
function Module(ident, options) {
  options = options || {};
  
  if (!ident.isTopLevel()) {
    throw errors.createEUNRES(module);
  }

  this.identifier = ident;
  this.requirers = [];
  this.id = ident.toString();
  this.searchPath = null;
}

(function(p) {
  p.missing = false;
  p._dependencies = null;
  p._directDependencies = null;
  p.raw = '';
  p.src = '';
  p.searchPath = null;
  p.fullPath = null;
  p.ext = null;
  p._totalSize = 0;
  
  p.resolve = resolve;
  function resolve(resolver, callback) {
    if (resolver && this._resolver === resolver) {
      process.nextTick(callback);
    } else {
      this._resolver = resolver;
      resolver.resolveModule(this, callback);
    }
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies() {
    return this._directDependencies;
  }
  
  p.getDependencies = getDependencies;
  function getDependencies() {
    if (!this._dependencies) {
      var deps = this._dependencies = {},
          stack = [this],
          children,
          child,
          m;
      
      while (stack.length) {
        m = stack.pop();
        children = m.getDirectDependencies();
        
        for (var id in children) {
          if (!(id in deps)) {
            child = children[id];
            deps[id] = child;
            stack.push(child);
          }
        }
      }
    }
    return this._dependencies;
  }
  
  p.getSize = getSize;
  function getSize() {
    return Buffer.byteLength(this.src);
  }
  
  p.getTotalSize = getTotalSize;
  function getTotalSize() {
    if (!this._totalSize) {
      var size = this.getSize(),
          deps = this.getDependencies();

      for (var id in deps) {
        size += deps[id].getSize();
      }

      this._totalSize = size;
    }
    return this._totalSize;
  }
  
  p.toString = toString;
  function toString() {
    return this.id;
  }
})(Module.prototype);


