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
  function createModule(ident, requirer) {
    var moduleCache = this.moduleCache,
        module,
        requirerIdentifier = requirer ? requirer.identifier : null,
        resolvedIdentifier = ident.resolve(requirerIdentifier),
        id = resolvedIdentifier.toString();

    if (moduleCache[id]) {
      module = moduleCache[id];
    } else {
      module = mod.createModule(resolvedIdentifier, {
        packageDescriptor: requirer ? requirer.packageDescriptor : null
      });
      moduleCache[id] = module;
    }
    if (requirer) {
      module.requirers.push(requirer);
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
      if (err) {  // needs better error handling
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
        requirerId = requirer ? requirer.id : null;
    
    process.nextTick(function() {
      try {
        self.parser.parse(src, requirerId).forEach(function(ident) {
          var module = self.createModule(ident, requirer);
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