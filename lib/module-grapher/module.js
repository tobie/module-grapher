var path = require('path'),
    fs = require('fs'),
    moduleGrapher = require('../module-grapher'),
    identifier = require('./identifier'),
    memoize = require('async-memoizer').memoize;
    
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
  function getSrc(callback) {
    var self = this,
        identifier = this.identifier.toString();
    
    if (this.isNative()) {
      process.nextTick(function() {
        callback(null, NATIVE_MODULES[identifier]);
      });
      return;
    }
    
    this.resolvePath(function(err, p) {
      if (err) {
        if (self.allowMissingModules) {
          self.missing = true;
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
          callback(null, src);
        }
      });
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(callback) {
    var resolver = this.dependencyResolver || moduleGrapher.defaultDependencyResolver;
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
  function getDirectDependencies(callback) {
    var resolver = this.dependencyResolver || moduleGrapher.defaultDependencyResolver;
    resolver.childrenFromModule(this, {}, callback);
  }
  
  p.getDependencies = getDependencies;
  function getDependencies(callback) {
    var resolver = this.dependencyResolver || moduleGrapher.defaultDependencyResolver;
    resolver.fromModule(this, {}, callback);
  }
  
  memoize(p, 'getSrc');
  memoize(p, 'getDependencies');
  memoize(p, 'getDirectDependencies');
  
})(Module.prototype);


