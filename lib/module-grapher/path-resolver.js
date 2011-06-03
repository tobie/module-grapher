var path = require('path'),
    fs = require('fs'),
    asyncIt = require('async-it'),
    npmPackageResolver = require('./package-resolver/npm');

exports.createPathResolver = createPathResolver;
function createPathResolver(searchPaths) {
  return new PathResolver(searchPaths);
}

exports.PathResolver = PathResolver;
function PathResolver(searchPaths) {
  this.searchPaths = searchPaths;
}

(function(p) {
  p.index = 0;
  p.searchPaths = null;
  
  p.resolve = resolve;
  function resolve(module, callback) {
    this.index = 0;
    this.module = module;
    this.next(callback);
  }

  p.resolveNPM = resolveNPM;
  function resolveNPM(module, callback) {
    npmPackageResolver.resolve(module, callback);
  }
  
  p.next = next;
  function next(callback) {
    var self = this,
        searchPath = this.searchPaths[this.index],
        relativePath = this.module.relativePath,
        currentPath = path.join(searchPath, relativePath);
    
    if (typeof searchPath == 'undefined') {
      callback(new Error('Cannot resolve path: "' + relativePath + '".'));
      return;
    }
    
    this.index++;
    if (npmPackageResolver.npmRoot == searchPath) {
      this.resolveNPM(this.module, function(err, p) {
        if (err) {
          callback(err);
        } else if (p) {
          callback(null, p);
        } else {
          self.checkPath(currentPath, callback);
        }
      });
    } else {
      self.checkPath(currentPath, callback);
    }
  }
  
  p.checkPath = checkPath;
  function checkPath(currentPath, callback) {
    var self = this;
    exports.testPath(currentPath, function(err, p) {
      if (err) {
        callback(err);
      } else if (p) {
        callback(null, p);
      } else {
        self.next(callback);
      }
    });
  }
})(PathResolver.prototype);

var EXT = '.js';
exports.addExtension = addExtension;
function addExtension(path) {
  if (path.lastIndexOf(EXT) != path.length - EXT.length) {
    path += EXT;
  }
  return path;
}

var extensions = ['', '.js', '.node', '.coffee'];

exports.removeExtension = removeExtension;
function removeExtension(p) {
  var ext = path.extname(p);
  return ext ? path.join(path.dirname(p), path.basename(p, ext)) : p;
}

exports.testPath = testPath;
function testPath(p, callback) {
  var paths = getPathsWithExtensions(p, true);
  findFirstPath(paths, callback);
}

exports.getPathsWithExtensions = getPathsWithExtensions;
function getPathsWithExtensions(p, includeIndex) {
  var ext, results = [];
  
  p = removeExtension(p);
  for (var i = 0, length = extensions.length; i < length; i++) {
    ext = extensions[i];
    results.push(p + ext);
    if (includeIndex) {
      results.push(path.join(p, 'index' + ext));
    }
  }
  return results;
}

exports.findFirstPath = findFirstPath;
function findFirstPath(paths, callback) {
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
