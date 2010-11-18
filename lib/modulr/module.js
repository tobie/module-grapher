var path = require('path'),
    fs = require('fs'),
    asyncIt = require('async-it'),
    pathResolver = require('./path_resolver'),
    parser = require('./parser');

exports.createModule = createModule;
function createModule(identifier) {
  return new Module(identifier);
}

function Module(identifier) {
  this.identifier = identifier;
}

(function(p) {
  p.requirer = null;
  
  p.getId = getId;
  p._id = null;
  function getId() {
    if (this._id == null) {
      var requirerIdentifier = this.requirer && this.requirer.identifier;
      this._id = this.identifier.resolve(requirerIdentifier);
    }
    return this._id;
  }
  
  p.getSrc = getSrc;
  function getSrc(callback) {
    var identifier = this.identifier;
    this.resolvePath(function(err, p) {
      if (err) {
        callback(err);
        return;
      }
      fs.readFile(p, 'utf8', function (err, src) {
        if (err || src == null) { // TODO test whether or not file exists before read
          err = new Error('Cannot load module: "' + identifier + '".');
          callback(err);
        } else {
          callback(null, src);
        }
      });
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(callback) {
    pathResolver.resolvePath(this, callback);
  }
  
  p.getRelativePath = getRelativePath;
  p._relativePath = null;
  function getRelativePath() {
    if (this._relativePath == null) {
      var requirerTerms = this.requirer && this.requirer.identifier.terms,
          terms = this.identifier.resolveTerms(requirerTerms);
      this._relativePath = path.join.apply(null, terms);
    }
    return this._relativePath;
  }
  
  p.getRequirerPackagePath = getRequirerPackagePath;
  function getRequirerPackagePath() {
    var m = this, p;
    while (m = m.requirer) {
      p = m.getPackagePath();
      if (p) { return p; }
    }
    return null;
  }
  
  p.setPackagePath = setPackagePath;
  p._packagePath = null;
  function setPackagePath(p) {
    return this._packagePath = p;
  }
  
  p.getPackagePath = getPackagePath;
  function getPackagePath() {
    return this._packagePath;
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies(callback) {
    var self = this;
    this.getSrc(function(err, src) {
      if (err) {
        callback(err);
      } else {
        try {
          var dependencies = {};
          parser.parse(src).forEach(function(id) {
            var m = createModule(id);
            m.requirer = self;
            dependencies[m.getId()] = m;
          });
          callback(null, dependencies);
        } catch(err) {
          callback(err);
        }
      }
    });
  }
  
  p.getDependencies = getDependencies;
  function getDependencies(callback) {
    _getDependencies({}, this, callback);
  }
  
  function _getDependencies(output, dep, callback) {
    dep.getDirectDependencies(function(err, dependencies) {
      if (err) {
        callback(err);
        return;
      }
      
      asyncIt.forEach(Object.keys(dependencies), function(id, cont) {
        if (id in output) {
          cont(null);
        } else {
          var m = dependencies[id];
          output[id] = m;
          _getDependencies(output, m, cont);
        }
      }, function(err) {
        callback(err, output);
      });
    });
  }
})(Module.prototype);
