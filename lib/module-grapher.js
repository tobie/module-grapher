var pathResolver = require('./module-grapher/path-resolver'),
    dependencyResolver = require('./module-grapher/dependency-resolver');

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});
exports.defaultDependencyResolver = dependencyResolver.createDependencyResolver({searchPaths: _paths});
exports.defaultPathResolver = pathResolver.createPathResolver(_paths);

