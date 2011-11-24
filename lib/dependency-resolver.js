var identifier = require('./identifier'),
    parallelize = require('async-it').parallel;

exports.DependencyResolver = DependencyResolver;
function DependencyResolver(config) {
  this.config = config || {};
  this.srcResolver = this.createSrcResolver(this.config);
  this.parser = this.createParser(this.config);
  this.moduleFactory = this.createModuleFactory(this.config);
  this.moduleCache = {};
}

(function(p) {
  p.parser = null;
  p.srcResolver = null;
  p.moduleCache = null;

  p.createModule = createModule;
  function createModule(ident) {
    if (typeof ident == 'string') {
      ident = identifier.create(ident).resolve();
    }

    var moduleCache = this.moduleCache,
        id = ident.toString();

    if (!(id in moduleCache)) {
      moduleCache[id] = this.moduleFactory.create(ident);
    }
    return moduleCache[id];
  }

  p.createModuleFactory = createModuleFactory;
  function createModuleFactory(config) {
    return require('./module');
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

    if (!callback) {
      callback = result;
      result = this.createResult(this.config);
    }

    result.setMain(module);
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

    if (!callback) {
      callback = result;
      result = this.createResult(this.config);
    }

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
    var self = this;
    parallelize.forEach(Object.keys(modules), function(id, cont) {
      var module = modules[id];
      if (result.hasDependency(module)) {
        cont(null);
      } else {
        module.resolve(self, function(err) {
          if (err) {
            cont(err);
          } else {
            result.addDependency(module);
            self.resolveModules(module.getDirectDependencies(), result, cont);
          }
        });
      }
    }, callback);
  }

  p.resolveModule = resolveModule;
  function resolveModule(module, callback) {
    var self = this;
    this.srcResolver.resolve(module, function(err) {
      if (err) {
        module.missing = true;
        self.config.allowMissingModules ? callback(null) : callback(err);
      } else {
        try {
          self.compile(module);
          var result = self.parse(module.src, module);
          module.ast = result.ast;
          result.forEach(function(ident) {
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
    var file = requirer ? requirer.fullPath : '@', // firebug convention
        reqIdent = requirer ? requirer.identifier : null,
        parserOutput = this.parser.parse(src, file),
        results = [];

    results.ast = parserOutput.ast;

    parserOutput.forEach(function(arg) {
      var err, ident;
      // Check if the call to require has arguments.
      if (!arg) {
        err = new TypeError('Empty require call');
      } else if (arg[0] != 'string') { // Check if the identifier is a string.
        // If dynamic identifiers are allowed just log.
        // Dynamic identifiers might be useful to require modules
        // at runtime but breaks static analysis.
        if (this.config.allowDynamicModuleIdentifiers) {
          // TODO log warning to the console in verbose mode
        } else {
          // If dynamic identifiers aren't allowed, create an error.
          // Get actual source code to throw more meaningful errors.
          err = new TypeError('Cannot resolve dynamic module identifiers: ' + this.parser.astToSrcCode(arg));
        }
      } else {
        // Build an identifier object to check for validity.
        ident = identifier.create(arg[1]);

        // If the identifier is not valid, throw.
        if (!ident.isValid()) {
          err = new TypeError('Invalid module identifier: ' + ident);
        }
        // Try resoving the identifer.
        try {
          ident = ident.resolve(reqIdent);
        } catch(e) {
          err = e;
        }
      }

      if (err) {
        err.file = file;
        err.longDesc = err.toString() + '\n    in ' + file;
        err.toString = function() { return err.longDesc; };
        throw err;
      }

      if (ident) {
        results.push(ident);
      }
    }, this);
    return results;
  }
})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
exports.create = createDependencyResolver;
function createDependencyResolver(config) {
  return new DependencyResolver(config);
}