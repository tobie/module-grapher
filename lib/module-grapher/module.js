var path = require('path'),
    fs = require('fs'),
    moduleGrapher = require('../module-grapher'),
    identifier = require('./identifier');
    
var NATIVE_MODULES = process.binding('natives');

exports.createModule = createModule;
function createModule(id, options) {
  return new Module(id, options);
}

function Module(id, options) {
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
  function getSrc(callback) {
    var self = this,
        identifier = this.identifier.toString();
    
    if (typeof this._src === 'string') {
      process.nextTick(function () {
        callback(null, self._src);
      });
      return;
    }
    
    if (this.isNative()) {
      process.nextTick(function() {
        self._src = NATIVE_MODULES[identifier];
        callback(null, self._src);
      });
      return;
    }
    
    this.resolvePath(null, function(err, p) {
      if (err) {
        if (self.allowMissingModules) {
          self.missing = true;
          self._src = '';
          callback(null, '');
        } else {
          callback(err);
        }
        return;
      }

      fs.readFile(p, 'utf8', function (err, src) {
        if (err || src == null) { // TODO test whether or not file exists before read
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
  function resolvePath(resolver, callback) {
    resolver = resolver || moduleGrapher.defaultDependencyResolver;
    resolver.resolvePath(this, callback);
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
  p.dependencyResolver = null;
  p.pathResolver = null;
  p.allowMissingModules = false;
  p._isPackageModule = false;
  p.packageDescriptor = null;
  function mergeOptions(options) {
    this.dependencyResolver = options.dependencyResolver || this.dependencyResolver;
    this.pathResolver = options.pathResolver || this.pathResolver;
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
      process.nextTick(function() {
        callback(null, directDependencies);
      });
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
      process.nextTick(function() {
        callback(null, dependencies);
      });
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


