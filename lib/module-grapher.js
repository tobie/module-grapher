var pathResolver = require('./module-grapher/path-resolver'),
    dependencyResolver = require('./module-grapher/dependency-resolver'),
    pathResolver = require('./module-grapher/path-resolver');

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});

exports.defaultDependencyResolver = dependencyResolver.createDependencyResolver();
exports.defaultPathResolver = pathResolver.createPathResolver(function() {
  var searchPaths = exports.paths.slice(0);
  searchPaths.push.apply(searchPaths, require.paths);
  return searchPaths;
});
