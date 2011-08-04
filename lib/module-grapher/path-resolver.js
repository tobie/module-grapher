var main = require('../module-grapher'),
    path = require('path'),
    fs = require('fs'),
    consts = require('constants'),
    asyncIt = require('async-it');

function isFile(p, callback) {
  fs.stat(p, function(err, stat) {
    callback(err ? false : stat.isFile());
  });
}

exports.createPathResolver = createPathResolver;
function createPathResolver(config) {
  return new PathResolver(config);
}

exports.PathResolver = PathResolver;
function PathResolver(config) {
  this.searchPaths = config.searchPaths || [process.cwd()];
  this.extensions = config.extensions || ['', '.js', '.coffee'];
  this.includeIndex = config.includeIndex || false;
}

(function(p) {
  p.index = 0;
  p.searchPaths = null;
  p.module = null;
  
  p.resolve = resolve;
  function resolve(module, callback) {
    var self = this,
        relativePath = module.relativePath;
        
    function success(currentSearchPath, p) {
      // found it!!
      module.searchPath = currentSearchPath;
      module.fullPath = p;
      callback(null, p);
    }
    
    asyncIt.serial.forEach(this.searchPaths, function(currentSearchPath, nextPath) {
      var fullPath = path.join(currentSearchPath, relativePath);
      
      asyncIt.serial.forEach(self.extensions, function(ext, nextExtension) {
        var p = fullPath + ext;
        isFile(p, function(exists) {
          if (exists) {
            success(currentSearchPath, p);
          } else if (self.includeIndex) {
            // look for [modName]/index[.ext]
            p = path.join(fullPath, 'index') + ext;
            isFile(p, function(exists) {
              exists ? success(currentSearchPath, p) : nextExtension();
            });
          } else {
            nextExtension();
          }
        });
      }, nextPath);
    }, function() {
      var err = new Error('Cannot resolve path: "' + module.relativePath + '".');
      err.errno = main.EPATH;
      err.module = module;
      err.identifier = module.identifier;
      callback(err);
    });
  }
})(PathResolver.prototype);