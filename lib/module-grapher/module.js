var path = require('path'),
    fs = require('fs'),
    identifier = require('./identifier');
    
var NATIVE_MODULES = process.binding('natives');

function nextTick(fn, args) {
  process.nextTick(function() {
    fn.apply(null, args);
  });
}

exports.createModule = createModule;
function createModule(id, options) {
  return new Module(id, options);
}

function Module(id, options) {
  options = options || {};
  if (typeof id == 'string') {
    id = identifier.createIdentifier(id);
  }
  this.identifier = id;
  this.mergeOptions(options);
  this.resolvedIdentifier = this.resolveIdentifier(options.requirerIdentifier);
  this.id = this.resolvedIdentifier.toString();
  this.relativePath = path.join.apply(path, this.resolvedIdentifier.terms);
}

(function(p) {
  p.getSrc = getSrc;
  p._src = null;
  p._pathResolver = null;
  function getSrc(pathResolver, callback) {
    var self = this,
        identifier = this.identifier.toString();
    
    if (pathResolver && pathResolver === this._pathResolver &&
        typeof this._src === 'string') {
      nextTick(callback, [null, this._src]);
      return;
    }
    
    this._pathResolver = pathResolver;
    
    if (this.isNative()) {
      this._src = NATIVE_MODULES[identifier];
      nextTick(callback, [null, this._src]);
      return;
    }
    
    this.resolvePath(pathResolver, function(err, p) {
      if (err) {
        self.missing = true;
        self._src = '';
        callback(err);
        return;
      }

      fs.readFile(p, 'utf8', function (err, src) {
        if (err || src == null) {
          self.missing = true;
          self._src = '';
          err = new Error('Cannot load module: "' + identifier + '".');
          callback(err);
        } else {
          self._src = src;
          callback(null, src);
        }
      });
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(pathResolver, callback) {
    pathResolver.resolve(this, callback);
  }
  
  p.resolveIdentifier = resolveIdentifier;
  function resolveIdentifier(requirerIdentifier) {
    if (!requirerIdentifier || this.identifier.isTopLevel()) {
      return this.identifier.clone();
    } else  {
      return this.identifier.resolve(requirerIdentifier);
    }
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
  p.missing = false;
  function isMissing() {
    return this.missing;
  }
  
  p.isPackage = isPackage;
  function isPackage() {
    return !this.isPackageModule() && !!this.packageDescriptor;
  }
  
  p.isPackageModule = isPackageModule;
  function isPackageModule() {
    return this._isPackageModule;
  }
  
  p.isNative = isNative;
  function isNative() {
    var identifier = this.identifier.toString();
    return (identifier in NATIVE_MODULES);
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


