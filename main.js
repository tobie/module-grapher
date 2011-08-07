var dependencyResolver = require('./lib/dependency-resolver'),
    identifier = require('./lib/identifier'),
    fs = require('fs');

exports.fromSrc = function(src, config, callback) {
  if (!callback) {
    callback = config;
    config = {};
  }
  var resolver = dependencyResolver.create(config);
  resolver.fromSrc(src, null, {}, callback);
};

exports.fromModuleIdentifier = function(ident, config, callback) {
  if (!callback) {
    callback = config;
    config = {};
  }
  ident = identifier.create(ident);
  var resolver = dependencyResolver.create(config),
      module = resolver.createModule(ident);
  resolver.fromModule(module, {}, callback);
};

exports.fromPath = function(p, config, callback) {
  fs.readFile(p, 'utf8', function(err, src) {
    err ? callback(err) : exports.fromSrc(src, config, callback);
  })
};
