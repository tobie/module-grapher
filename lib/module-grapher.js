var pathResolver = require('./module-grapher/path-resolver'),
    dependencyResolver = require('./module-grapher/dependency-resolver');

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});
exports.defaultDependencyResolver = dependencyResolver.createDependencyResolver({
  searchpathResolver: pathResolver.createPathResolver(_paths)
});

exports.fromSrc = function(src, callback) {
  exports.defaultDependencyResolver.fromSrc(src, null, {}, callback);
};
