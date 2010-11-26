var path = require('path'),
    fs = require('fs'),
    pathResolver = require('./path-resolver'),
    moduleGrapher = require('../module-grapher'),
    identifier = require('./identifier'),
    memoize = require('async-memoizer').memoize;
    
var NATIVE_MODULES = process.binding('natives');

var moduleCache = {};
exports.createUniqueModule = createUniqueModule;
function createUniqueModule(id, requirer) {
  var m = createModule(id, requirer);
  id = m.id;
  if (moduleCache[id]) {
    m = moduleCache[id];
  } else {
    moduleCache[id] = m;
  }
  return m;
}

exports.createModule = createModule;
function createModule(id, requirer) {
  return new Module(id, requirer);
}

function Module(id, requirer) {
  if (typeof id == 'string') {
    id = identifier.createIdentifier(id);
  }
  this.identifier = id;
  this.requirer = requirer || null;
  this.resolvedIdentifier = this.resolveIdentifier();
  this.id = this.resolvedIdentifier.toString();
  this.relativePath = path.join.apply(path, this.resolvedIdentifier.terms);
}

(function(p) {
  p.packagePath = null;
  p.dependencyResolver = moduleGrapher.defaultDependencyResolver;
  p.pathResolver = moduleGrapher.defaultPathResolver;
  
  p.getSrc = getSrc;
  function getSrc(callback) {
    var identifier = this.identifier.toString();
    
    if (this.isNative()) {
      process.nextTick(function() {
        callback(null, NATIVE_MODULES[identifier]);
      });
      return;
    }
    
    this.resolvePath(function(err, p) {
      if (err) {
        callback(err);
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
    this.pathResolver.resolve(this, callback);
  }
  
  p.resolveIdentifier = resolveIdentifier;
  function resolveIdentifier() {
    var identifier = this.identifier,
        requirer = this.requirer;
    if (!requirer || identifier.isTopLevel()) {
      return identifier.clone();
    } else  {
      return identifier.resolve(requirer.resolvedIdentifier);
    }
  }
  
  p.getRequirerPackagePath = getRequirerPackagePath;
  function getRequirerPackagePath() {
    var m = this, p;
    while (m = m.requirer) {
      p = m.packagePath;
      if (p) { return p; }
    }
    return null;
  }
  
  p.isPackage = isPackage;
  function isPackage() {
    return !!this.packagePath;
  }
  
  p.isNative = isNative;
  function isNative() {
    var identifier = this.identifier.toString();
    return (identifier in NATIVE_MODULES);
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies(callback) {
    this.dependencyResolver.childrenFromModule(this, {}, callback);
  }
  
  p.getDependencies = getDependencies;
  function getDependencies(callback) {
    this.dependencyResolver.fromModule(this, {}, callback);
  }
  
  memoize(p, 'getSrc');
  memoize(p, 'getDependencies');
  memoize(p, 'getDirectDependencies');
  
})(Module.prototype);


