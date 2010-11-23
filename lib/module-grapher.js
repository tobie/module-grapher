var pathResolver = require('./module-grapher/path-resolver');

Object.defineProperty(exports, 'paths', {
  get: function() {
    return pathResolver.paths;
  }
});
