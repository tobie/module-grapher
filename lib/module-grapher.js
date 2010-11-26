var pathResolver = require('./module-grapher/path-resolver'),
    dependencyResolver = require('./module-grapher/dependency-resolver');

Object.defineProperty(exports, 'paths', {
  get: function() {
    return pathResolver.paths;
  }
});

exports.defaultDependencyResolver = dependencyResolver.createDependencyResolver();
