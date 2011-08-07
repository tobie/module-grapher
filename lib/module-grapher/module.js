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
  
  p.resolveSrc = resolveSrc;
  function resolveSrc(resolver, callback) {
    var self = this;
    
    if (resolver && resolver === this._resolver &&
        typeof this.src === 'string') {
      nextTick(callback, [null, this.src]);
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
            callback(null, src);
          }
        });
      }
    });
  }
  
  p.resolveDirectDependencies = resolveDirectDependencies;
  function resolveDirectDependencies(resolver, callback) {
    var self = this,
        directDependencies = this.directDependencies;
    
    if (resolver && this._resolver === resolver && directDependencies) {
      nextTick(callback, [null, directDependencies]);
      return;
    }
    
    this._resolver = resolver;
    resolver.childrenFromModule(this, {}, function(err, directDependencies) {
      if (err) {
        callback(err);
      } else {
        self.directDependencies = directDependencies;
        callback(null, directDependencies);
      }
    });
  }
  
  p.resolveDependencies = resolveDependencies;
  function resolveDependencies(resolver, callback) {
    var self = this,
        dependencies = this.dependencies;
    
    if (resolver && this._resolver === resolver && dependencies) {
      nextTick(callback, [null, dependencies]);
      return;
    }
    
    this._resolver = resolver;
    resolver.fromModule(this, {}, function(err, dependencies) {
      if (err) {
        callback(err);
      } else {
        self.dependencies = dependencies;
        callback(null, dependencies);
      }
    });
  }
  
})(Module.prototype);


