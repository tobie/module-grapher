var errors = require('./errors'),
    mod = require('./module'),
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

  p.resolvePath = resolvePath;
  function resolvePath(module, callback) {
    this.pathResolver.resolve(module, callback);
  }

  p.createPathResolver = createPathResolver;
  function createPathResolver(config) {
    return require('./path-resolver').create(config);
  }

  p.createParser = createParser;
  function createParser(config) {
    return require('./parser').create(config);
  }

  p.fromModule = fromModule;
  function fromModule(module, accumulator, callback) {
    var self = this;
    module.resolveDirectDependencies(self, function(err, modules) {
      err ? callback(err) : self.fromModules(modules, accumulator, callback);
    });
  }
  
  p.fromModules = fromModules;
  function fromModules(modules, accumulator, callback) {
    var self = this;
    parallelize.forEach(Object.keys(modules), function(id, cont) {
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
  function fromSrc(src, requirer, callback) {
    try {
      var modules = this.parse(src, requirer);
      this.fromModules(modules, {}, callback);
    } catch(err) {
      process.nextTick(callback.bind(null, err));
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