var pathResolver = require('../path-resolver');

exports.PackageResolver = PackageResolver;
function PackageResolver(module) {
  this.module = module;
  this.relativePath = module.relativePath;
  this.packagePath = path.join(npmDir, this.relativePath, 'active', 'package');
  this.descriptorPath = path.join(this.packagePath, 'package.json');
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var self = this;
    path.exists(this.descriptorPath, function(exists) {
      if (exists) {
        self.getPackageDescriptor(function(err, json) {
          if (err) {
            callback(err);
            return;
          }

          var dirname = path.dirname(json.main || ''),
              libPath = path.join(self.packagePath, dirname),
              filePath = path.join(libPath, pathResolver.addExtension(json.main || 'index'));
              
          self.module.packagePath = libPath;
          
          callback(null, filePath);
        });
      } else {
        callback(null, null);
      }
    });
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
})(PackageResolver.prototype);

function PackageModuleResolver(module) {
  this.module = module;
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var p = path.join(this.module.packagePath, this.module.relativePath);
    pathResolver.testPath(p, callback);
  }
})(PackageModuleResolver.prototype);

exports.createResolver = createResolver;
function createResolver(module) {
  if (module.packagePath) {
    return new PackageResolver(module);
  } else {
    return new PackageModuleResolver(module);
  }
}
