var path = require('path'),
    fs = require('fs'),
    npm,
    npmRoot,
    npmDir;
    
var EXT = '.js';
    
try {
  npm = require('npm');
  npmRoot = npm.root;
  npmDir = npm.dir;
} catch(e) {
  npm = npmRoot = npmDir = null;
}

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
    createNPMResolver(module).resolve(callback);
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
    if (npmRoot == searchPath) {
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
    path.exists(currentPath + EXT, function(exist) {
      if (exist) {
        callback(null, currentPath + EXT);
      } else {
        currentPath = path.join(currentPath, 'index.js');
        path.exists(currentPath, function(exist) {
          exist ? callback(null, currentPath) : self.next(callback);
        });
      }
    });
  }
})(PathResolver.prototype);

exports.NPMResolver = NPMResolver;
function NPMResolver(module) {
  this.module = module;
  this.relativePath = module.relativePath;
  this.packagePath = path.join(npmDir, this.relativePath, 'active', 'package');
  this.descriptorPath = path.join(this.packagePath, 'package.json');
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    if (this.module.packagePath) {
      var p = path.join(this.module.packagePath, this.relativePath);
      process.nextTick(function() {
        callback(null, p);
      });
    } else {
      this.resolvePath(callback);
    }
  }
  
  p.getPackageDescriptor = getPackageDescriptor;
  function getPackageDescriptor(callback) {
    fs.readFile(this.descriptorPath, 'utf8', function(err, data) {
      if (err) {
        callback(err);
      } else {
        try {
          callback(null, JSON.parse(data));
        } catch(err) {
          callback(err);
        }
      }
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(callback) {
    var self = this;
    path.exists(this.descriptorPath, function(exists) {
      if (exists) {
        self.getPackageDescriptor(function(err, json) {
          if (err) {
            callback(err);
            return;
          }

          var libPath = path.join(self.packagePath, path.dirname(json.main));
          self.module.packagePath = libPath;
          var main = json.main || 'index';
          if (main.lastIndexOf(EXT) !=  main.length - EXT.length) {
            main += EXT;
          }

          callback(null, path.join(libPath, main));
        });
      } else {
        callback(null, null);
      }
    });
  }
  
})(NPMResolver.prototype);

exports.createNPMResolver = createNPMResolver;
function createNPMResolver(module) {
  return new NPMResolver(module);
}