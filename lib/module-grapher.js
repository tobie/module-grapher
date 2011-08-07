var dependencyResolver = require('./module-grapher/dependency-resolver'),
    identifier = require('./module-grapher/identifier'),
    fs = require('fs');

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});

exports.defaultDependencyResolver = dependencyResolver.create({
  searchPaths: _paths,
  allowDynamicModuleIdentifiers: true
});

exports.fromSrc = function(src, callback) {
  exports.defaultDependencyResolver.fromSrc(src, null, {}, callback);
};

exports.fromModuleIdentifier = function(ident, callback) {
  ident = identifier.create(ident);
  var module = exports.defaultDependencyResolver.createModule(ident);
  exports.defaultDependencyResolver.fromModule(module, {}, callback);
};

exports.fromPath = function(p, callback) {
  fs.readFile(p, 'utf8', function(err, src) {
    if (err) {
      callback(err);
    } else {
      exports.fromSrc(src, callback);
    }
  })
};
