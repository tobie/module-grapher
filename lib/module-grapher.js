var pathResolver = require('./module-grapher/path-resolver'),
    dependencyResolver = require('./module-grapher/dependency-resolver'),
    parser = require('./module-grapher/parser'),
    identifier = require('./module-grapher/identifier'),
    fs = require('fs');

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});

parser.allowDynamicModuleIdentifiers = true; // TODO export options.

exports.defaultDependencyResolver = dependencyResolver.createDependencyResolver({
  pathResolver: pathResolver.createPathResolver({
    searchPaths: _paths
  }),
  parser: parser
});

exports.fromSrc = function(src, callback) {
  exports.defaultDependencyResolver.fromSrc(src, null, {}, callback);
};

exports.fromModuleIdentifier = function(ident, callback) {
  ident = identifier.createIdentifier(ident);
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
