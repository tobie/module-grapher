var parser = require('./parser'),
    mod = require('./module'),
    asyncIt = require('async-it');

function DependencyResolver(options) {
  this.options = Object.create({
    listPackageDependencies: false,
    listNativeModuleDependencies: false,
    allowMissingModules: false
  }, options);
  this.moduleCache = {};
}

(function(p) {
  p.parser = parser;
  
  p.createModule = createModule;
  function createModule(id, options) {
    var moduleCache = this.moduleCache,
        module,
        mergedOptions = {
          dependencyResolver: this,
          allowMissingModules: this.options.allowMissingModules
        };
        
    for (var prop in options) {
      mergedOptions[prop] = options[prop];
    }

    module = mod.createModule(id, mergedOptions);
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
    var self = this;
    if (!this.options.listPackageDependencies && module.isPackage()) {
      callback(null, accumulator);
    } else if (!this.options.listNativeModuleDependencies && module.isNative()) {
      callback(null, accumulator);
    } else {
      module.getDirectDependencies(function(err, modules) {
        err ? callback(err) : self.fromModules(modules, accumulator, callback);
      });
    }
  }

  p.childrenFromModule = childrenFromModule;
  function childrenFromModule(module, accumulator, callback) {
    var self = this;
    module.getSrc(function(err, src) {
      err ? callback(err) : self.childrenFromSrc(src, module, accumulator, callback);
    });
  }
  
  p.fromModules = fromModules;
  function fromModules(modules, accumulator, callback) {
    var self = this;
    asyncIt.forEach(Object.keys(modules), function(id, cont) {
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
    asyncIt.forEach(Object.keys(modules), function(id, cont) {
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
    var self = this;
    process.nextTick(function() {
      try {
        self.parser.parse(src).forEach(function(id) {
          var module = self.createModule(id, { requirer: requirer });
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