var path = require('path'),
    fs = require('fs'),
    consts = require('constants'),
    serialize = require('async-it').serial,
    errors = require('./errors');

function isFile(p, callback) {
  fs.stat(p, function(err, stat) {
    callback(err ? false : stat.isFile());
  });
}

exports.createPathResolver = createPathResolver;
exports.create = createPathResolver;
function createPathResolver(config) {
  return new PathResolver(config);
}

exports.PathResolver = PathResolver;
function PathResolver(config) {
  this.paths = config.paths || [process.cwd()];
  this.extensions = config.extensions || ['', '.js', '.coffee'];
  this.includeIndex = config.includeIndex || false;
}

(function(p) {
  p.index = 0;
  p.paths = null;
  p.module = null;
  
  p.resolve = resolve;
  function resolve(module, callback) {
    var self = this,
        relativePath = module.relativePath;
        
    function success(currentSearchPath, p) {
      module.searchPath = currentSearchPath;
      module.fullPath = p;
      callback(null, p);
    }
    
    serialize.forEach(this.paths, function(currentSearchPath, nextPath) {
      var fullPath = path.join(currentSearchPath, relativePath);
      
      serialize.forEach(self.extensions, function(ext, nextExtension) {
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
      var err = errors.createEPATH(module);
      callback(err);
    });
  }
})(PathResolver.prototype);