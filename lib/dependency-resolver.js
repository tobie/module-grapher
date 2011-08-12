var errors = require('./errors'),
    mod = require('./module'),
    fs = require('fs'),
    parallelize = require('async-it').parallel;

function DependencyResolver(config) {
  this.allowMissingModules = !!config.allowMissingModules;
  this.pathResolver = this.createPathResolver(config);
  this.parser = this.createParser(config);
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
      module = mod.create(resolvedIdentifier, {});
      moduleCache[id] = module;
    }
    if (requirer) {
      module.requirers.push(requirer);
    }
    return module;
  }

  p.createPathResolver = createPathResolver;
  function createPathResolver(config) {
    return require('./path-resolver').create(config);
  }

  p.createParser = createParser;
  function createParser(config) {
    return require('./parser').create(config);
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
  function fromModule(module, callback) {
    var self = this;
    module.resolve(self, function(err) {
      if (err) {
        callback(err);
      } else {
        self.resolveModules(module.getDirectDependencies(), {}, callback);
      }
    });
  }

  p.fromSrc = fromSrc;
  function fromSrc(src, requirer, callback) {
    try {
      var modules = this.parse(src, requirer);
      this.resolveModules(modules, {}, callback);
    } catch(err) {
      process.nextTick(callback.bind(null, err));
    }
  }

  p.resolveModules = resolveModules;
  function resolveModules(modules, accumulator, callback) {
    var self = this;
    parallelize.forEach(Object.keys(modules), function(id, cont) {
      if (id in accumulator) {
        cont(null);
      } else {
        var module = modules[id];
        accumulator[id] = module;
        module.resolve(self, function(err) {
          if (err) {
            callback(err);
          } else {
            self.resolveModules(module.getDirectDependencies(), accumulator, cont);
          }
        });
      }
    }, function() {
      callback(null, accumulator);
    });
  }
  
  p.resolveModule = resolveModule;
  function resolveModule(module, callback) {
    var self = this;
    this.pathResolver.resolve(module, function(err, p) {
      if (err) {
        self.handleMissingModule(module, err, callback);
      } else {
        fs.readFile(p, 'utf8', function(err, src) {
          if (err) {
            self.handleMissingModule(module, err, callback);
          } else if (src == null) {
            err = errors.createEMISSING(module);
            self.handleMissingModule(module, err, callback);
          } else {
            try {
              module.raw = src;
              self.compile(module);
              module._directDependencies = self.parse(module.src, module);
              callback(null);
            } catch(err) {
              callback(err);
            }
          }
        });
      }
    });
  }
  
  p.handleMissingModule = handleMissingModule;
  function handleMissingModule(module, err, callback) {
    // Must be wrapped inside a process.nextTick call
    // if called by sync code.
    module.missing = true;
    if (this.allowMissingModules) {
      module._directDependencies = {};
      callback(null);
    } else {
      callback(err);
    }
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