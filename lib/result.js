var module = require('./module'),
    identifier = require('./identifier');

exports.Result = Result;
function Result(config) {
  this.dependencies = {};
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

})(Result.prototype);

exports.createResult = createResult;
exports.create = createResult;
function createResult(main) {
  return new Result(main);
}