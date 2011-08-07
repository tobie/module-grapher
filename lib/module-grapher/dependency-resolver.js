var errors = require('./errors'),
    mod = require('./module'),
    asyncIt = require('async-it');

function DependencyResolver(config) {
  this.allowMissingModules = !!config.allowMissingModules;
  this.pathResolver = config.pathResolver;
  this.parser = config.parser;
  this.moduleCache = {};
}

(function(p) {
  p.allowMissingModules = false;
  p.parser = null;
  p.pathResolver = null;
  p.moduleCache = null;
  
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
      module = mod.createModule(resolvedIdentifier, {});
      moduleCache[id] = module;
    }
    if (requirer) {
      module.requirers.push(requirer);
    }
    return module;
  }

  p.resolvePath = resolvePath;
  function resolvePath(module, callback) {
    this.pathResolver.resolve(module, callback);
  }

  
  p.fromModule = fromModule;
  function fromModule(module, accumulator, callback) {
    var self = this;
    module.resolveDirectDependencies(self, function(err, modules) {
      err ? callback(err) : self.fromModules(modules, accumulator, callback);
    });
  }

  p.childrenFromModule = childrenFromModule;
  function childrenFromModule(module, accumulator, callback) {
    var self = this;
    module.resolveSrc(this, function(err, src) {
      if (err) {
        if (err.errno === errors.EMISSING && self.allowMissingModules) {
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
function createDependencyResolver(config) {
  return new DependencyResolver(config);
}