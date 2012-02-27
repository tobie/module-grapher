var path = require('path'),
    pathHelpers = require('./path-helpers'),
    fs = require('fs'),
    serialize = require('async-it').serial;

exports.createSrcResolver = createSrcResolver;
exports.create = createSrcResolver;
function createSrcResolver(config) {
  return new SrcResolver(config);
}

exports.SrcResolver = SrcResolver;
function SrcResolver(config) {
  this.config = this.normalizeConfig(config);
}

(function(p) {
  p.config = null;

  p.normalizeConfig = normalizeConfig;
  function normalizeConfig(input) {
    input = input || {};
    var output = {},
        exts = input.extensions || ['.js', '.coffee'];

    for (var prop in input) {
      output[prop] = input[prop];
    }

    output.extensions = this.normalizeExtensions(exts);
    output.paths = (output.paths || ['.']).slice(0); // clone it
    if (output.paths.indexOf('.') < 0) { output.paths.push('.'); }
    output.root = input.root || process.cwd();
    return output;
  }

  p.normalizeExtensions = normalizeExtensions;
  function normalizeExtensions(extensions) {
    return extensions.map(pathHelpers.normalizeExt);
  }


  p.resolve = resolve;
  function resolve(module, callback) {
    var relativePath = path.join.apply(path, module.identifier.terms);
    this.resolvePath(relativePath, module, callback);
  }

  p.resolvePath = resolvePath;
  function resolvePath(relativePath, module, callback) {
    var self = this;
    // Iterate over each paths supplied in `config`.
    serialize.forEach(this.config.paths, function(currentPath, checkNextPath) {
      var resolvedPath = path.resolve(self.config.root, currentPath, relativePath);
      self.resolveExtension(resolvedPath, module, function(p, isDir) {
        if (p) {
          module.searchPath = currentPath;
          self.readSrc(p, module, function(err, src) {
            if (err) {
              module.missing = true;
              callback(err, isDir);
            } else {
              module.raw = src;
              callback(null, isDir);
            }
          });
        } else {
          checkNextPath();
        }
      });
    }, function() {
      var err = new Error('Cannot find module: ' + module),
          exts = '.[' + self.config.extensions.map(function(e) { return e.substring(1); }).join('|') + ']';

      err.file = module.lastRequiredBy ? module.lastRequiredBy.fullPath : '@'; // firebug convention
      err.longDesc = err.toString() + '\n    in ' + err.file + '\nTried looking for it in the following files:';
      self.config.paths.forEach(function(searchPath) {
        err.longDesc +='\n    ' + path.resolve(self.config.root, searchPath, relativePath + exts);
        if (self.config.allowDirModules) {
          err.longDesc +='\n    ' + path.resolve(self.config.root, searchPath, relativePath, 'index' + exts);
        }
      });
      err.toString = function() { return err.longDesc };
      callback(err);
    });
  }

  p.resolveExtension = resolveExtension;
  function resolveExtension(fullPath, module, callback) {
    var self = this;
    var extensionsToCheck = this.config.extensions.concat('');
    serialize.forEach(extensionsToCheck, function(ext, checkNextExtension) {
      var p = fullPath + ext;
      fs.stat(p, function(err, stats) {
        if (!err && stats.isFile()) {
          module.mtime = stats.mtime
          module.fullPath = p;
          module.relativePath = path.relative(self.config.root, p);
          module.ext = ext;
          callback(p, false);
        } else if (self.config.allowDirModules) {
          // look for [modName]/index[.ext]
          p = path.join(fullPath, 'index') + ext;
          fs.stat(p, function(err, stats) {
            if (!err && stats.isFile()) {
              module.mtime = stats.mtime;
              module.fullPath = p;
              module.relativePath = path.relative(self.config.root, p);
              module.ext = ext;
              callback(p, true);
            } else {
              checkNextExtension();
            }
          });
        } else {
          checkNextExtension();
        }
      });
    }, callback);
  }

  p.readSrc = readSrc;
  function readSrc(fullPath, module, callback) {
    var self = this;
    fs.readFile(fullPath, 'utf8', function(err, src) {
      if (err) {
        err.message = 'Cannot find module: ' + module + '. ' + err.message;
        callback(err);
      } else if (src == null) {
        err = new Error('Cannot find module: ' + module + '. File ' + fullPath + ' does not exist.' );
        callback(err);
      } else {
        self.src = src;
        callback(null, src);
      }
    });
  }
})(SrcResolver.prototype);
