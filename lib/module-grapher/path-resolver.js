var main = require('../module-grapher'),
    path = require('path'),
    fs = require('fs'),
    asyncIt = require('async-it');

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
    this.index = 0;
    this.module = module;
    this.next(callback);
  }
  
  p.next = next;
  function next(callback) {
    var self = this,
        currentSearchPath = this.currentSearchPath = this.searchPaths[this.index],
        relativePath = this.module.relativePath,
        currentPath = path.join(currentSearchPath, relativePath);

    if (typeof currentSearchPath == 'undefined') {
      var err = new Error('Cannot resolve path: "' + relativePath + '".');
      err.errno = main.EPATH;
      err.module = this.module;
      err.identifier = this.module.identifier;
      callback(err);
      return;
    }
    
    this.index++;
    self.checkPath(currentPath, callback);
  }

  p.checkPath = checkPath;
  function checkPath(currentPath, callback) {
    var self = this,
        paths = this.listPossiblePaths(currentPath);

    this.findFirstExistingPath(paths, function(err, p) {
      if (err) {
        callback(err);
      } else if (p) {
        self.module.searchPath = self.currentSearchPath;
        callback(null, p);
      } else {
        self.next(callback);
      }
    });
  }

  p.listPossiblePaths = listPossiblePaths;
  function listPossiblePaths(p) {
    var ext,
        extensions = this.extensions,
        includeIndex = this.includeIndex,
        results = [];

    p = this.removeExtension(p);
    for (var i = 0, length = extensions.length; i < length; i++) {
      ext = extensions[i];
      results.push(p + ext);
      if (includeIndex) {
        results.push(path.join(p, 'index' + ext));
      }
    }
    return results;
  }

  p.findFirstExistingPath = findFirstExistingPath;
  function findFirstExistingPath(paths, callback) {
    asyncIt.serial.forEach(paths, function(p, cont) {
      fs.stat(p, function(err, stat) {
        if (err) {
          cont();
        } else {
          stat.isFile() ? callback(null, p) : cont();
        }
      })
    }, function() { callback(null, null); });
  }

  p.removeExtension = removeExtension;
  function removeExtension(p) {
    var ext = path.extname(p);
    return ext ? path.join(path.dirname(p), path.basename(p, ext)) : p;
  }
})(PathResolver.prototype);
