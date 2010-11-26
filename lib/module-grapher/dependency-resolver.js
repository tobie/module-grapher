var parser = require('./parser'),
    mod = require('./module'),
    asyncIt = require('async-it');

function DependencyResolver() {
  this.moduleCache = {};
}

(function(p) {
  p.parser = parser;
  
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
  
  p.createModule = createModule;
  function createModule(id, requirer) {
    var module = mod.createModule(id, requirer),
        moduleCache = this.moduleCache;
    id = module.id;
    if (moduleCache[id]) {
      module = moduleCache[id];
    } else {
      moduleCache[id] = module;
    }
    module.dependencyResolver = this;
    return module;
  }
  
  p.fromModule = fromModule;
  function fromModule(requirer, accumulator, callback) {
    var self = this;
    requirer.getDirectDependencies(function(err, dependencies) {
      if (err) {
        callback(err);
        return;
      }
      self.fromModules(dependencies, accumulator, callback);
    });
  }

  p.childrenFromModule = childrenFromModule;
  function childrenFromModule(requirer, accumulator, callback) {
    var self = this;
    requirer.getSrc(function(err, src) {
      if (err) {
        callback(err);
      } else {
        self.childrenFromSrc(src, requirer, accumulator, callback);
      }
    });
  }
  
  p.childrenFromSrc = childrenFromSrc;
  function childrenFromSrc(src, requirer, accumulator, callback) {
    var self = this;
    process.nextTick(function() {
      try {
        self.parser.parse(src).forEach(function(id) {
          var module = self.createModule(id, requirer);
          accumulator[module.id] = module;
        });
        callback(null, accumulator);
      } catch(err) {
        callback(err);
      }
    });
  }
  
  p.fromSrc = fromSrc;
  function fromSrc(src, requirer, accumulator, callback) {
    var self = this;
    this.childrenFromSrc(src, requirer, accumulator, function(err, modules) {
      if (err) {
        callback(err);
      } else {
        self.fromModules(modules, accumulator, callback);
      }
    });
  }

})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
function createDependencyResolver() {
  return new DependencyResolver();
}