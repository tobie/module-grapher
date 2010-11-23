var parser = require('./parser'),
    mod = require('./module'),
    asyncIt = require('async-it');

exports.getDependencies = getDependencies;
function getDependencies(requirer, accumulator, callback) {
  requirer.getDirectDependencies(function(err, dependencies) {
    if (err) {
      callback(err);
      return;
    }
    
    asyncIt.forEach(Object.keys(dependencies), function(id, cont) {
      if (id in accumulator) {
        cont(null);
      } else {
        var m = dependencies[id];
        accumulator[id] = m;
        getDependencies(m, accumulator, cont);
      }
    }, function(err) {
      callback(err, accumulator);
    });
  });
}

exports.getDirectDependencies = getDirectDependencies;
function getDirectDependencies(requirer, accumulator, callback) {
  requirer.getSrc(function(err, src) {
    if (err) {
      callback(err);
    } else {
      try {
        parser.parse(src).forEach(function(id) {
          var m = mod.createModule(id);
          m.requirer = requirer;
          accumulator[m.getId()] = m;
        });
        callback(null, accumulator);
      } catch(err) {
        callback(err);
      }
    }
  });
}