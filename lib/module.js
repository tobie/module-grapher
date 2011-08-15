var errors = require('./errors');

exports.createModule = createModule;
exports.create = createModule;
function createModule(ident) {
  return new Module(ident);
}

exports.Module = Module;
function Module(ident) {
  if (!ident.isTopLevel()) {
    throw errors.createEUNRES(module);
  }

  this.identifier = ident;
  this.id = ident.toString();
  this.searchPath = null;
}

(function(p) {
  p.missing = false;
  p._dependencies = null;
  p._directDependencies = null;
  p._requirers = null;
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

  p.addDependency = addDependency;
  function addDependency(m) {
    var id = m.id,
        deps = this._directDependencies = this._directDependencies || {};
    if (!(id in deps)) {
      deps[id] = m;
      m.addRequirer(this);
    }
  }

  p.addRequirer = addRequirer;
  function addRequirer(m) {
    var id = m.id,
        reqs = this._requirers = this._requirers || {};
    if (!(id in reqs)) { reqs[id] = m; }
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies() {
    return (this._directDependencies = this._directDependencies || {});
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

  p.getRequirers = getRequirers;
  function getRequirers() {
    return (this._requirers = this._requirers || {});
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


