var fs = require('fs');

exports.isFile = isFile;
function isFile(p, callback) {
  fs.stat(p, function(err, stat) {
    callback(err ? false : stat.isFile());
  });
}
