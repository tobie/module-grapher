var fs = require('fs'),
    path = require('path'),
    pathResolver = require('../path-resolver'),
    packageDescriptor = require('./package-descriptor'),
    npm = null;
    
try {
  npm = require('npm');
  exports.npmRoot = npm.root;
  exports.npmDir = npm.dir;
} catch(e) {}

exports.PackageResolver = PackageResolver;
function PackageResolver(module) {
  this.module = module;
  this.relativePath = module.relativePath;
  this.packagePath = path.join(exports.npmDir, this.relativePath, 'active', 'package');
  this.descriptorPath = path.join(this.packagePath, 'package.json');
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var self = this;
    path.exists(this.descriptorPath, function(exists) {
      if (exists) {
        self.getPackageDescriptor(function(err, descriptor) {
          if (err) {
            callback(err);
            return;
          }
          self.module.packageDescriptor = descriptor;
          
          var name = pathResolver.addExtension(descriptor.name || 'index'),
              filePath = path.join(descriptor.path, name);
          
          callback(null, filePath);
        });
      } else {
        callback(null, null);
      }
    });
  }
  
  p.getPackageDescriptor = getPackageDescriptor;
  function getPackageDescriptor(callback) {
    var self = this;
    fs.readFile(this.descriptorPath, 'utf8', function(err, data) {
      if (err) {
        callback(err);
      } else {
        try {
          var descriptor = self.createPackageDescriptor(data);
          callback(null, descriptor);
        } catch(err) {
          callback(err);
        }
      }
    });
  }
  
  p.createPackageDescriptor = createPackageDescriptor;
  function createPackageDescriptor(data) {
    var dirname = path.dirname(data.main || ''),
        libPath = path.join(this.packagePath, dirname),
        descriptor;
        
    descriptor = packageDescriptor.createPackageDescriptor(data.name, libPath, data.modules);
    descriptor.type = 'npm';
    return descriptor;
  }
})(PackageResolver.prototype);

function ModuleResolver(module) {
  this.module = module;
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var p = path.join(this.module.packageDescriptor.path, this.module.relativePath);
    pathResolver.testPath(p, callback);
  }
})(ModuleResolver.prototype);

function ExposedModuleResolver(module) {
  this.module = module;
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var p = path.join(this.module.packagePath, this.module.relativePath);
    pathResolver.testPath(p, callback);
  }
})(ExposedModuleResolver.prototype);

exports.createResolver = createResolver;
function createResolver(module) {
  if (module.packagePath) {
    return new ModuleResolver(module);
  } else if (module.identifier.isTopLevel() && module.identifier.terms.length > 1) {
  } else {
    return new PackageResolver(module);
  }
}
