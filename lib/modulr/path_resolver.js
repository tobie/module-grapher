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
      _resolveNPM(p, function(err, output) {
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

function _resolveNPM(p, callback) {
  ini.resolveConfigs({ loglevel: 'silent' }, function (err) {
    var current;
    if (err) {
      callback(err);
      return;
    }
    p = path.join(npm.dir, p, 'active', 'package');
    current = path.join(p, 'package.json')
    fs.readFile(current, 'utf8', function(err, json) {
      if (err) {
        callback(err);
        return;
      }
      
      try {
        json = JSON.parse(json);
        var EXT = '.js',
            part = json.main || 'index',
            lastIndex = part.length - EXT.length;
            
        if (part.lastIndexOf(EXT) != lastIndex) {
          part += EXT;
        }
        
        callback(null, path.join(p, part));
      } catch(err) {
        callback(err);
      }
    });
  });
}
