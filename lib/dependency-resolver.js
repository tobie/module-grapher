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
  function createModule(ident) {
    var moduleCache = this.moduleCache,
        id = ident.toString();

    if (!(id in moduleCache)) {
      moduleCache[id] = mod.create(ident);
    }
    return moduleCache[id];
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
    var self = this,
        modules = {};
    try {
      self.parse(src).forEach(function(ident) {
        var m = self.createModule(ident);
        modules[m.id] = m;
      });
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
        self.allowMissingModules ? callback(null) : callback(err);
      } else {
        try {
          self.compile(module);
          self.parse(module.src, module).forEach(function(ident) {
            var dep = self.createModule(ident);
            module.addDependency(dep);
          });
          callback(null);
        } catch(err) {
          callback(err);
        }
      }
    });
  }

  p.parse = parse;
  function parse(src, requirer) {
    var requirerIdentifier = requirer ? requirer.identifier : null;
    return this.parser.parse(src, requirer).map(function(ident) {
      return ident.resolve(requirerIdentifier);
    });
  }
})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
exports.create = createDependencyResolver;
function createDependencyResolver(config) {
  return new DependencyResolver(config);
}