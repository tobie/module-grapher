var module = require('./module'),
    identifier = require('./identifier');

exports.Result = Result;
function Result(config) {
  this.dependencies = {};
  this.packages = {};
  this.externals = this.normalizeExternals(config.externals);
}

(function(p) {
  p.resolved = false;
  p.main = null;

  p.resolve = resolve;
  function resolve(resolver) {
    this.resolved = true
    this.timestamp = new Date();
    this.resolver = resolver;
  }

  p.normalizeExternals = normalizeExternals;
  function normalizeExternals(externals) {
    if (Array.isArray(externals)) {
      return externals.reduce(function(output, ident) {
        ident = identifier.create(ident);
        var m = module.create(ident);
        m.external = true;
        output[m.id] = m;
        return output;
      }, {});
    }
    return externals || {};
  }

  p.setMain = setMain;
  function setMain(module) {
    this.main = module;
    this.dependencies[module.id] = module;
  }

  p.addDependency = addDependency;
  function addDependency(module) {
    if (this.hasDependency(module)) { return; }
    this.dependencies[module.id] = module;
    if (module.package) {
      this.addPackage(module.package);
    }
  }

  p.hasDependency = hasDependency;
  function hasDependency(module) {
    return (module.id in this.dependencies);
  }

  p.addPackage = addPackage;
  function addPackage(pckg) {
    if (!this.hasPackage(pckg)) {
      this.packages[pckg.id] = pckg;
    }
  }

  p.hasPackage = hasPackage;
  function hasPackage(pckg) {
    return (pckg.id in this.packages);
  }

  p.getLoc = getLoc;
  function getLoc() {
    return this.main.getTotalLoc();
  }

  p.getSloc = getSloc;
  function getSloc() {
    return this.main.getTotalSloc();
  }

  p.getSize = getSize;
  function getSize() {
    return this.main.getTotalSize();
  }
})(Result.prototype);

exports.createResult = createResult;
exports.create = createResult;
function createResult(config) {
  return new Result(config);
}