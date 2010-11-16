var path = require('path'),
    fs = require('fs'),
    npm, ini;
    
try {
  npm = require('npm');
  ini = require("npm/utils/ini");
} catch(e) {
  npm = null;
}

var _paths = [];
Object.defineProperty(exports, 'paths', {
  get: function() {
    return _paths;
  }
});

exports.resolvePath = resolvePath;
function resolvePath(m, callback) {
  var paths,
      length,
      index = 0,
      p = m.getRelativePath();
  
  paths = _paths.slice(0)
  paths.push.apply(paths, require.paths);
  length = paths.length;
  callback = callback || function() {};
    
  function _resolvePath() {
    var currentPath = paths[index],
        current = path.join(currentPath, p),
        withExt = current + '.js';
    
    if (index >= length) {
      callback(new Error('Cannot resolve path: "' + p + '".'));
      return;
    }
    
    if (npm && npm.root == currentPath) {
      _resolveNPM(m, p, function(err, output) {
        if (err) {
          index++;
          _resolvePath();
        } else {
          callback(null, output);
        }
      });
      return;
    }

    path.exists(withExt, function(exist) {
      if (exist) {
        callback(null, withExt);
      } else {
        current = path.join(current, 'index.js');
        path.exists(current, function(exist) {
          if (exist) {
            callback(null, current);
          } else {
            index++;
            _resolvePath();
          }
        });
      }
    });
  }
  
  _resolvePath();
}

function _resolveNPM(m, p, callback) {
  ini.resolveConfigs({ loglevel: 'silent' }, function (err) {
    if (err) {
      callback(err);
      return;
    }
    
    var EXT = '.js',
        packagePath = m.getRequirerPackagePath();
    
    if (packagePath) {
      callback(null, path.join(packagePath, p));
    } else {
      var packageFile = path.join(npm.dir, p, 'active', 'package', 'package.json');
      _readPackageFile(packageFile, function(err, json) {
        
        if (err) {
          callback(err);
          return;
        }

        var main = json.main || 'index',
            dirname = path.dirname(json.main) || '.',
            lastIndex = main.length - EXT.length;
        
        packagePath = path.join(npm.dir, p, 'active', 'package', dirname);
        m.setPackagePath(packagePath);

        if (main.lastIndexOf(EXT) != lastIndex) {
          main += EXT;
        }
        callback(null, path.join(packagePath, main));
      });
    }
  });
}

function _readPackageFile(f, callback) {
  fs.readFile(f, 'utf8', function(err, data) {
    if (err) {
      callback(err);
      return;
    }
    
    try {
      callback(null, JSON.parse(data));
    } catch(err) {
      callback(err);
    }
  });
}
