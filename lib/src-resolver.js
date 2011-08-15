var path = require('path'),
    pathHelpers = require('./path-helpers'),
    fs = require('fs'),
    serialize = require('async-it').serial,
    errors = require('./errors');

exports.createSrcResolver = createSrcResolver;
exports.create = createSrcResolver;
function createSrcResolver(config) {
  return new SrcResolver(config);
}

exports.SrcResolver = SrcResolver;
function SrcResolver(config) {
  this.paths = config.paths || ['.'];
  this.root = config.root || process.cwd();
  this.allowDirModules = !!config.allowDirModules;
  var exts = config.extensions || ['.js', '.coffee'];
  this.extensions = this.normalizeExtensions(exts);
}

(function(p) {
  p.paths = null;
  p.root = null;

  p.normalizeExtensions = normalizeExtensions;
  function normalizeExtensions(extensions) {
    return extensions.map(pathHelpers.normalizeExt);
  }

  p.resolve = resolve;
  function resolve(module, callback) {
    var self = this,
        relativePath = path.join.apply(path, module.identifier.terms);

    // Iterate over each paths supplied in `config`.
    serialize.forEach(this.paths, function(currentPath, checkNextPath) {
      var resolvedPath = path.resolve(self.root, currentPath, relativePath);
      self.resolveExtension(resolvedPath, function(p) {
        if (p) {
          module.searchPath = currentPath
          module.fullPath = p;
          module.fullPath = p;
          module.ext = path.extname(p);
          self.readSrc(p, function(err, src) {
            if (err) {
              module.missing = true;
              callback(err)
            } else {
              module.raw = src;
              callback(null);
            }
          });
        } else {
          checkNextPath()
        }
      });
    }, function() {
      callback(errors.createEPATH(module));
    });
  }

  p.resolveExtension = resolveExtension;
  function resolveExtension(fullPath, callback) {
    var self = this;

    serialize.forEach(this.extensions, function(ext, checkNextExtension) {
      var p = fullPath + ext;
      pathHelpers.isFile(p, function(exists) {
        if (exists) {
          callback(p);
        } else if (self.allowDirModules) {
          // look for [modName]/index[.ext]
          p = path.join(fullPath, 'index') + ext;
          pathHelpers.isFile(p, function(exists) {
            exists ? callback(p) : checkNextExtension();
          });
        } else {
          checkNextExtension();
        }
      });
    }, callback);
  }

  p.readSrc = readSrc;
  function readSrc(fullPath, callback) {
    var self = this;
    fs.readFile(fullPath, 'utf8', function(err, src) {
      if (err) {
        callback(err);
      } else if (src == null) {
        callback(errors.createEMISSING(module));
      } else {
        self.src = src;
        callback(null, src);
      }
    });
  }
})(SrcResolver.prototype);