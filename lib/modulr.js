var pathResolver = require('./modulr/path_resolver'),
    fs = require('fs'),
    npm, ini;

Object.defineProperty(exports, 'paths', {
  get: function() {
    return pathResolver.paths;
  }
});