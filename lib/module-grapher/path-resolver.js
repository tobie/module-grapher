var path = require('path'),
    fs = require('fs'),
    npm,
    npmRoot,
    npmDir;
    
var EXT = '.js',
    INI_OPTIONS = { loglevel: 'silent' };
    
try {
  npm = require('npm');
  npmRoot = npm.root;
  npmDir = npm.dir;
} catch(e) {
  npm = null;
  npmRoot = null;
  npmDir = null;
}

exports.createPathResolver = createPathResolver;
function createPathResolver(getSearchPaths) {
  return new PathResolver(getSearchPaths);
}

exports.PathResolver = PathResolver;
function PathResolver(getSearchPaths) {
  this.getSearchPaths = getSearchPaths || function() {
    return require.paths.slice(0);
  };
}

(function(p) {
  p.index = 0;
  p.searchPaths = null;
  
  p.resolve = resolve;
  function resolve(module, callback) {
    this.index = 0;
    this.searchPaths = this.getSearchPaths();
    this.next(module, callback);
  }

  p.resolveNPM = resolveNPM;
  function resolveNPM(module, callback) {
    createNPMResolver(module).resolve(callback);
  }
  
  p.next = next;
  function next(module, callback) {
    var self = this,
        searchPath = this.searchPaths[this.index],
        currentPath = path.join(searchPath, module.relativePath);
    
    if (typeof searchPath == 'undefined') {
      callback(new Error('Cannot resolve path: "' + module.relativePath + '".'));
      return;
    }
    
    this.index++;
    if (npmRoot == searchPath) {
      this.resolveNPM(module, function(err, p) {
        err ? self.next(module, callback) : callback(null, p);
      });
    } else {
      path.exists(currentPath + EXT, function(exist) {
        if (exist) {
          callback(null, currentPath + EXT);
        } else {
          currentPath = path.join(currentPath, 'index.js');
          path.exists(currentPath, function(exist) {
            exist ? callback(null, currentPath) : self.next(module, callback);
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
  this.packagePath = path.join(npmDir, this.relativePath, 'active', 'package');
  this.descriptorPath = path.join(this.packagePath, 'package.json');
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var packagePath = this.module.packagePath;
    if (packagePath) {
      var p = path.join(packagePath, this.relativePath);
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
    npm.load(INI_OPTIONS, function (err) {
      if (err) {
        callback(err);
        return;
      }
      
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
    });
  }
  
})(NPMResolver.prototype);

exports.createNPMResolver = createNPMResolver;
function createNPMResolver(module) {
  return new NPMResolver(module);
}