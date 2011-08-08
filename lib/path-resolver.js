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
  this.paths = config.paths || [];
  this.root = config.root || process.cwd();
  this.extensions = config.extensions || ['.js', '.coffee'];
  this.includeIndex = !!config.includeIndex;
}

(function(p) {
  p.paths = null;
  p.root = null;

  p.resolve = resolve;
  function resolve(module, callback) {
    var self = this,
        relativePath = module.relativePath;

    // wrap callbacks
    function success(currentPath, p) {
      module.searchPath = currentPath;
      module.fullPath = p;
      callback(null, p);
    }
    
    function failure() {
      var err = errors.createEPATH(module);
      callback(err);
    }

    if (this.paths.length) {
      // Iterate over each paths supplied in `config`.
      serialize.forEach(this.paths, function(currentPath, checkNextPath) {
        var resolvedPath = path.resolve(self.root, currentPath, relativePath);
        self.resolveExtension(resolvedPath, function(p) {
          p ? success(currentPath, p) : checkNextPath();
        });
      }, failure);
    } else {
      self.resolveExtension(path.join(this.root, relativePath), function(p) {
        p ? success('.', p) : failure();
      });
    }
  }

  p.resolveExtension = resolveExtension;
  function resolveExtension(fullPath, callback) {
    var self = this;

    serialize.forEach(this.extensions, function(ext, checkNextExtension) {
      var p = fullPath + ext;
      isFile(p, function(exists) {
        if (exists) {
          callback(p);
        } else if (self.includeIndex) {
          // look for [modName]/index[.ext]
          p = path.join(fullPath, 'index') + ext;
          isFile(p, function(exists) {
            exists ? callback(p) : checkNextExtension();
          });
        } else {
          checkNextExtension();
        }
      });
    }, callback)
  }
})(PathResolver.prototype);