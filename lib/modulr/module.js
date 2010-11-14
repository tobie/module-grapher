var path = require('path'),
    fs = require('fs'),
    modulr = require('../modulr'),
    parser = require('./parser');

exports.resolvePath = resolvePath;
function resolvePath(m, callback) {
  modulr.resolvePath(m.getPath(), callback);
}

exports.createModule = createModule;
function createModule(identifier, requirer) {
  return new Module(identifier, requirer);
}

function Module(identifier, requirer) {
  this.identifier = identifier;
  this.requirer = requirer || null;
}

(function(p) {
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
          callback(new Error('Cannot load module "' + identifier +'".'));
        } else {
          callback(null, src);
        }
      });
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(callback) {
    exports.resolvePath(this, callback);
  }
  
  p.getPath = getPath;
  p._path = null;
  function getPath() {
    if (this._path == null) {
      var requirerTerms = this.requirer && this.requirer.identifier.terms,
          terms = this.identifier.resolveTerms(requirerTerms);
      this._path = path.join.apply(null, terms);
    }
    return this._path;
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies(callback) {
    this.getSrc(function(err, src) {
      if (err) {
        callback(err);
      } else {
        try {
          callback(null, parser.parse(src));
        } catch(e) {
          callback(e);
        }
      }
    });
  }
})(Module.prototype);
