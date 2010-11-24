var path = require('path'),
    fs = require('fs'),
    npm,
    ini;
    
var EXT = '.js',
    INI_OPTIONS = { loglevel: 'silent' };
    
try {
  npm = require('npm');
  ini = require("npm/utils/ini");
} catch(e) {
  npm = null;
}

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});

exports.resolvePath = resolvePath;
function resolvePath(module, callback) {
  var searchPaths = _paths.slice(0);
  searchPaths.push.apply(searchPaths, require.paths);
  createPathResolver(module).resolve(searchPaths, callback);
}
exports.createPathResolver = createPathResolver;
function createPathResolver(module) {
  return new PathResolver(module);
}

exports.PathResolver = PathResolver;
function PathResolver(module) {
  this.module = module;
  this.relativePath = module.relativePath;
}

(function(p) {
  p.resolve = resolve;
  function resolve(searchPaths, callback) {
    this.index = 0;
    this.callback = callback;
    this.searchPaths = searchPaths.slice(0);
    this.next();
  }

  p.resolveNPM = resolveNPM;
  function resolveNPM(callback) {
    createNPMResolver(this.module).resolve(callback);
  }
  
  p.next = next;
  function next() {
    var self = this,
        searchPath = this.searchPaths[this.index],
        currentPath = path.join(searchPath, this.relativePath);
    
    if (typeof searchPath == 'undefined') {
      this.callback(new Error('Cannot resolve path: "' + this.relativePath + '".'));
      return;
    }
    
    this.index++;
    
    if (npm && npm.root == searchPath) {
      this.resolveNPM(function(err, p) {
        err ? self.next() : self.callback(null, p);
      });
    } else {
      path.exists(currentPath + EXT, function(exist) {
        if (exist) {
          self.callback(null, currentPath + EXT);
        } else {
          currentPath = path.join(currentPath, 'index.js');
          path.exists(currentPath, function(exist) {
            if (exist) {
              self.callback(null, currentPath);
            } else {
              self.next();
            }
          });
        }
      });
    }
  }
})(PathResolver.prototype);

exports.NPMResolver = NPMResolver;
function NPMResolver(module) {
  this.module = module;
  this.relativePath = module.relativePath;
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var requirerPackagePath = this.module.getRequirerPackagePath();
    if (requirerPackagePath) {
      var p = path.join(requirerPackagePath, this.relativePath);
      process.nextTick(function() {
        callback(null, p);
      });
    } else {
      this.resolvePath(callback);
    }
  }
  
  p.getPackageDescriptorPath = getPackageDescriptorPath;
  function getPackageDescriptorPath() {
    return path.join(this.getPackagePath(), 'package.json');
  }
  
  p.getPackagePath = getPackagePath;
  function getPackagePath() {
    return path.join(npm.dir, this.relativePath, 'active', 'package');
  }
  
  p.getPackageDescriptor = getPackageDescriptor;
  function getPackageDescriptor(callback) {
    fs.readFile(this.getPackageDescriptorPath(), 'utf8', function(err, data) {
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
    ini.resolveConfigs(INI_OPTIONS, function (err) {
      if (err) {
        callback(err);
        return;
      }
      
      self.getPackageDescriptor(function(err, json) {

        if (err) {
          callback(err);
          return;
        }
        
        var libPath = path.join(self.getPackagePath(), path.dirname(json.main));
        self.module.packagePath = libPath;
        
        var main = json.main || 'index';
        if (main.lastIndexOf(EXT) !=  main.length - EXT.length) {
          main += EXT;
        }
        
        callback(null, path.join(libPath, main));
      });
    });
  }
  
})(NPMResolver.prototype);

exports.createNPMResolver = createNPMResolver;
function createNPMResolver(module) {
  return new NPMResolver(module);
}