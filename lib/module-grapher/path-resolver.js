var path = require('path'),
    fs = require('fs'),
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

exports.removeExtension = removeExtension;
function removeExtension(path) {
  var index = path.lastIndexOf(EXT);
  if (index == path.length - EXT.length) {
    return path.substr(0, p);
  }
  return path;
}

exports.testPath = testPath;
function testPath(p, callback) {
  var p = exports.removeExtension(p);
  path.exists(p + EXT, function(exist) {
    if (exist) {
      callback(null, p + EXT);
    } else {
      p = path.join(p, 'index.js');
      path.exists(p, function(exist) {
        callback(null, exist ? p : null);
      });
    }
  });
}

