exports.createModule = createModule;
exports.create = createModule;
function createModule(ident) {
  return new Module(ident);
}

exports.Module = Module;
function Module(ident) {
  if (!ident.isTopLevel()) {
    throw new TypeError('Cannot instantiate Module from unresolved identifier: ' + ident);
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
  p.ast = null;
  p.searchPath = null;
  p.fullPath = null;
  p.ext = null;
  p._totalSize = 0;
  p._totalLoc = 0;
  p._totalSloc = 0;

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

  p.getLoc = getLoc;
  function getLoc() {
    return this.raw.split('\n').length;
  }

  p.getSloc = getSloc;
  function getSloc() {
    return this.raw.split(/\n\s*/).length;
  }

  p.getTotalSize = _makeSummingMethod('Size');
  p.getTotalLoc = _makeSummingMethod('Loc');
  p.getTotalSloc = _makeSummingMethod('Sloc');

  function _makeSummingMethod(prop) {
    var cacheName = '_total' + prop,
        methodName = 'get' + prop;

    return function() {
      if (!this[cacheName]) {
        var sum = this[methodName](),
            deps = this.getDependencies();

        for (var id in deps) {
          sum += deps[id][methodName]();
        }

        this[cacheName] = sum;
      }
      return this[cacheName];
    }
  }

  p.toString = toString;
  function toString() {
    return this.id;
  }
})(Module.prototype);

