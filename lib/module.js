var errors = require('./errors'),
    path = require('path'),
    fs = require('fs'),
    identifier = require('./identifier');
    
function nextTick(fn, args) {
  process.nextTick(function() {
    fn.apply(null, args);
  });
}

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
  p.directDependencies = null;
  p.src = null;
  p.searchPath = null;
  p.fullPath = null;
  
  p.resolve = resolve;
  function resolve(resolver, callback) {
    var self = this;
    
    if (resolver && this._resolver === resolver) {
      nextTick(callback, [null, this]);
      return;
    }
    
    this._resolver = resolver;
    resolver.resolvePath(this, function(err, p) {
      if (err) {
        self.missing = true;
        self.src = '';
        callback(err);
      } else {
        fs.readFile(p, 'utf8', function (err, src) {
          if (err || src == null) {
            self.missing = true;
            self.src = '';
            err = errors.createEMISSING(self);
            callback(err);
          } else {
            self.src = src;
            try {
              self.directDependencies = resolver.parse(src, self);
              callback(null, self);
            } catch(err) {
              callback(err);
            }
          }
        });
      }
    });
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


