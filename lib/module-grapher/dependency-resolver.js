var pathResolver = require('./path-resolver'),
    parser = require('./parser'),
    mod = require('./module'),
    asyncIt = require('async-it');

function DependencyResolver(options) {
  this.options = Object.create({
    listPackageDependencies: false,
    listNativeModuleDependencies: false,
    allowMissingModules: false,
    allowDynamicModuleIdentifiers: true,
    getSearchPaths: function() {
      return require.paths.slice(0);
    }
  }, options);
  this.parser.allowDynamicModuleIdentifiers = this.options.allowDynamicModuleIdentifiers;
  this.moduleCache = {};
}

(function(p) {
  p.parser = parser;
  
  p.createModule = createModule;
  function createModule(id, options) {
    var moduleCache = this.moduleCache,
        module;

    module = mod.createModule(id, options);
    id = module.id;
    if (moduleCache[id]) {
      module = moduleCache[id];
    } else {
      moduleCache[id] = module;
    }
    return module;
  }
  
  p.fromModule = fromModule;
  function fromModule(module, accumulator, callback) {
    var self = this, 
        options = this.options;
    if (!options.listPackageDependencies && module.isPackage()) {
      callback(null, accumulator);
    } else if (!options.listNativeModuleDependencies && module.isNative()) {
      callback(null, accumulator);
    } else {
      module.getDirectDependencies(self, function(err, modules) {
        err ? callback(err) : self.fromModules(modules, accumulator, callback);
      });
    }
  }

  p.childrenFromModule = childrenFromModule;
  function childrenFromModule(module, accumulator, callback) {
    var self = this,
        options = this.options,
        pR = pathResolver.createPathResolver(options.getSearchPaths());
    module.getSrc(pR, function(err, src) {
      if (err) {
        if (options.allowMissingModules) {
          callback(null, accumulator);
        } else {
          callback(err);
        }
      } else {
        self.childrenFromSrc(src, module, accumulator, callback);
      }
    });
  }
  
  p.fromModules = fromModules;
  function fromModules(modules, accumulator, callback) {
    var self = this;
    asyncIt.parallel.forEach(Object.keys(modules), function(id, cont) {
      if (id in accumulator) {
        cont(null);
      } else {
        var module = modules[id];
        accumulator[id] = module;
        self.fromModule(module, accumulator, cont);
      }
    }, function(err) {
      callback(err, accumulator);
    });
  }
  
  p.childrenFromModules = childrenFromModules;
  function childrenFromModules(modules, accumulator, callback) {
    var self = this;
    asyncIt.parallel.forEach(Object.keys(modules), function(id, cont) {
      if (id in accumulator) {
        cont(null);
      } else {
        var module = modules[id];
        accumulator[id] = module;
        self.childrenFromModule(module, accumulator, cont);
      }
    }, function(err) {
      callback(err, accumulator);
    });
  }
  
  p.fromSrc = fromSrc;
  function fromSrc(src, requirer, accumulator, callback) {
    var self = this;
    this.childrenFromSrc(src, requirer, {}, function(err, modules) {
      err ? callback(err) : self.fromModules(modules, accumulator, callback);
    });
  }
  
  p.childrenFromSrc = childrenFromSrc;
  function childrenFromSrc(src, requirer, accumulator, callback) {
    var self = this,
        requirerIdentifier = null,
        packageDescriptor = null,
        requirerId = null;
    
    if (requirer) {
      requirerIdentifier = requirer.resolvedIdentifier;
      packageDescriptor = requirer.packageDescriptor;
      requirerId = requirer.id;
    }
    
    process.nextTick(function() {
      try {
        self.parser.parse(src, requirerId).forEach(function(id) {
          var module = self.createModule(id, {
            requirerIdentifier: requirerIdentifier,
            packageDescriptor: packageDescriptor
          });
          accumulator[module.id] = module;
        });
        callback(null, accumulator);
      } catch(err) {
        callback(err);
      }
    });
  }
})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
function createDependencyResolver(options) {
  return new DependencyResolver(options);
}

exports.defaultDependencyResolver = createDependencyResolver();