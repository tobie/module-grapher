var uglify = require('uglify'),
    processor = uglify.uglify,
    parser = uglify.parser,
    createIdentifierFromString = require('./identifier').createIdentifierFromString;

var _toString = Object.prototype.toString;

exports.parse = parse;
function parse(string, file, line) {
  var ast;
  try {
    ast = parser.parse(string);
  } catch(err) {
    throw _betterParserErrors(err, file, line);
  }
  return _walk(ast, []);
}

function _betterParserErrors(err, file, line) {
  if (line) {
    err.line += line;
  }
  
  if (file) {
    err.file = file;
    err.toString = function() {
      return this.message +
        " (file: " + this.file +
        ", line: " + this.line +
        ", col: " + this.col +
        ", pos: " + this.pos +
        ")";
    }
  }
  return err;
}

function _walk(ast, results) {
  if (_toString.call(ast) == '[object Array]') {
    var type = ast[0],
        firstChild = ast[1],
        firstArg,
        identifier;
        
    if ((type == 'call' || type == 'new') && firstChild[0] == 'name' && firstChild[1] == 'require') {
      firstArg = ast[2][0];
      identifier = firstArg[1];
      if (firstArg[0] == 'string') {
        identifier = createIdentifierFromString(identifier);
        if (identifier.isValid()) {
          results.push(identifier);
        } else {
          throw new Error('Invalid module identifier: "' + identifier + '".');
        }
      } else {
        throw new Error('Dynamic module identifier: "' + processor.gen_code(firstArg, true) + '".');
      }
    } else if (ast.length) {
      for (var i = 0; i < ast.length; i++) {
        _walk(ast[i], results);
      }
    }
  }
  return results;
}