var errors = require('./errors'),
    path = require('path'),
    identifier = require('./identifier');

exports.createModule = createModule;
exports.create = createModule;
function createModule(ident, options) {
  return new Module(ident, options);
}

function Module(ident, options) {
  options = options || {};
  
  if (!ident.isTopLevel()) {
    throw errors.createEUNRES(module);
  }

  this.identifier = ident;
  this.requirers = [];
  this.id = ident.toString();
  this.relativePath = path.join.apply(path, ident.terms);
  this.searchPath = null;
}

(function(p) {
  p.missing = false;
  p.dependencies = null;
  p._directDependencies = null;
  p.src = '';
  p.searchPath = null;
  p.fullPath = null;
  
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
  
  p.getSize = getSize;
  function getSize() {
    return Buffer.byteLength(this.src);
  }
  
  p.toString = toString;
  function toString() {
    return this.id;
  }
})(Module.prototype);


