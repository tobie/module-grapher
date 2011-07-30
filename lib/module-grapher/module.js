var path = require('path'),
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
  this.mergeOptions(options);
  
  if (!ident.isTopLevel()) {
    throw new Error('Cannot instantiate Module from unresolved identifier: "' + ident + '".');
  }

  this.identifier = ident;
  this.requirers = [];
  this.id = ident.toString();
  this.relativePath = path.join.apply(path, ident.terms);
  this.searchPath = null;
}

(function(p) {
  p.getSrc = getSrc;
  p._src = null;
  p._pathResolver = null;
  function getSrc(pathResolver, callback) {
    var self = this;
    
    if (pathResolver && pathResolver === this._pathResolver &&
        typeof this._src === 'string') {
      nextTick(callback, [null, this._src]);
      return;
    }
    
    this._pathResolver = pathResolver;
    
    this.resolvePath(pathResolver, function(err, p) {
      if (err) {
        self._missing = true;
        self._src = '';
        callback(err);
      } else {
        fs.readFile(p, 'utf8', function (err, src) {
          if (err || src == null) {
            self._missing = true;
            self._src = '';
            err = new Error('Cannot load module: "' + self.id + '".');
            callback(err);
          } else {
            self._src = src;
            callback(null, src);
          }
        });
      }
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(pathResolver, callback) {
    pathResolver.resolve(this, callback);
  }
  
  p.mergeOptions = mergeOptions;
  p._pathResolver = null;
  p.allowMissingModules = false;
  p._isPackageModule = false;
  p.packageDescriptor = null;
  function mergeOptions(options) {
    this.allowMissingModules = !!options.allowMissingModules;
    this.packageDescriptor = options.packageDescriptor || this.packageDescriptor;
    this._isPackageModule = !!options.packageDescriptor;
  }
  
  p.isMissing = isMissing;
  p._missing = false;
  function isMissing() {
    return this._missing;
  }
  
  p.isPackage = isPackage;
  function isPackage() {
    return !this.isPackageModule() && !!this.packageDescriptor;
  }
  
  p.isPackageModule = isPackageModule;
  function isPackageModule() {
    return this._isPackageModule;
  }
  
  p.getDirectDependencies = getDirectDependencies;
  p._directDependencies = null;
  function getDirectDependencies(resolver, callback) {
    var self = this,
        directDependencies = this._directDependencies;
    
    if (resolver && this._dependencyResolver === resolver && directDependencies) {
      nextTick(callback, [null, directDependencies]);
      return;
    }
    
    this._dependencyResolver = resolver;
    resolver.childrenFromModule(this, {}, function(err, directDependencies) {
      if (err) {
        callback(err);
      } else {
        self._directDependencies = directDependencies;
        callback(null, directDependencies);
      }
    });
  }
  
  p.getDependencies = getDependencies;
  p._dependencies = null;
  function getDependencies(resolver, callback) {
    var self = this,
        dependencies = this._dependencies;
    
    if (resolver && this._dependencyResolver === resolver && dependencies) {
      nextTick(callback, [null, dependencies]);
      return;
    }
    
    this._dependencyResolver = resolver;
    resolver.fromModule(this, {}, function(err, dependencies) {
      if (err) {
        callback(err);
      } else {
        self._dependencies = dependencies;
        callback(null, dependencies);
      }
    });
  }
  
})(Module.prototype);


