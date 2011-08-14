var errors = require('./errors'),
    mod = require('./module'),
    parallelize = require('async-it').parallel;

function DependencyResolver(config) {
  this.allowMissingModules = !!config.allowMissingModules;
  this.srcResolver = this.createSrcResolver(config);
  this.parser = this.createParser(config);
  this.moduleCache = {};
}

(function(p) {
  p.allowMissingModules = false;
  p.parser = null;
  p.srcResolver = null;
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
      module = mod.create(resolvedIdentifier, {});
      moduleCache[id] = module;
    }
    if (requirer) {
      module.requirers.push(requirer);
    }
    return module;
  }

  p.createSrcResolver = createSrcResolver;
  function createSrcResolver(config) {
    return require('./src-resolver').create(config);
  }

  p.createParser = createParser;
  function createParser(config) {
    return require('./parser').create(config);
  }
  
  p.createResult = createResult;
  function createResult(config) {
    return require('./result').create(config);
  }

  p.compile = compile;
  function compile(module) {
    switch (module.ext) {
      case '.coffee':
        module.src = require('coffee-script').compile(module.raw);
        break;
      default:
        module.src = module.raw;
        break;
    }
  }
  
  p.fromModule = fromModule;
  function fromModule(module, result, callback) {
    var self = this;
    result.main = module;
    module.resolve(self, function(err) {
      if (err) {
        callback(err);
      } else {
        self.resolveModules(module.getDirectDependencies(), result, function(err) {
          result.resolve(self);
          callback(err, result);
        });
      }
    });
  }

  p.fromSrc = fromSrc;
  function fromSrc(src, result, callback) {
    var self = this;
    try {
      var modules = this.parse(src);
      this.resolveModules(modules, result, function(err) {
        result.resolve(self);
        callback(err, result);
      });
    } catch(err) {
      process.nextTick(function() {
        result.resolve(self);
        callback(err, result);
      });
    }
  }

  p.resolveModules = resolveModules;
  function resolveModules(modules, result, callback) {
    var self = this,
        deps = result.dependencies;
    parallelize.forEach(Object.keys(modules), function(id, cont) {
      if (id in deps) {
        cont(null);
      } else {
        var module = modules[id];
        deps[id] = module;
        module.resolve(self, function(err) {
          if (err) {
            callback(err);
          } else {
            self.resolveModules(module.getDirectDependencies(), result, cont);
          }
        });
      }
    }, function() {
      callback(null, result);
    });
  }
  
  p.resolveModule = resolveModule;
  function resolveModule(module, callback) {
    var self = this;
    this.srcResolver.resolve(module, function(err) {
      if (err) {
        module.missing = true;
        if (self.allowMissingModules) {
          module._directDependencies = {};
          callback(null);
        } else {
          callback(err);
        }
      } else {
        try {
          self.compile(module);
          module._directDependencies = self.parse(module.src, module);
          callback(null);
        } catch(err) {
          callback(err);
        }
      }
    });
  }

  p.parse = parse;
  function parse(src, requirer) {
    var accumulator = {};
    this.parser.parse(src, requirer).forEach(function(ident) {
      var module = this.createModule(ident, requirer);
      accumulator[module.id] = module;
    }, this);
    return accumulator;
  }
})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
exports.create = createDependencyResolver;
function createDependencyResolver(config) {
  return new DependencyResolver(config);
}