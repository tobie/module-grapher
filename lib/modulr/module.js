var path = require('path'),
    fs = require('fs'),
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
        if (err) {
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
  
  p.isNPM = isNPM;
  function isNPM() {
    var self = this;
    do {
      if (self.npm) { return true; }
    } while (self = self.requirer)
    return false;
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies(callback) {
    var self = this;
    this.getSrc(function(err, src) {
      if (err) {
        callback(err);
      } else {
        try {
          var deps = parser.parse(src).map(function(id) {
            var m = createModule(id);
            m.requirer = self;
            return m;
          });
          callback(null, deps);
        } catch(e) {
          callback(e);
        }
      }
    });
  }
})(Module.prototype);
