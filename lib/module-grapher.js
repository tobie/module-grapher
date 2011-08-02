var pathResolver = require('./module-grapher/path-resolver'),
    dependencyResolver = require('./module-grapher/dependency-resolver'),
    parser = require('./module-grapher/parser');

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
