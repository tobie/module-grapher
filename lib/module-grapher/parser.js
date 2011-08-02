var main = require('../module-grapher'),
    uglify = require('uglify-js'),
    processor = uglify.uglify,
    parser = uglify.parser,
    createIdentifier = require('./identifier').createIdentifier;

var _toString = Object.prototype.toString;

exports.allowDynamicModuleIdentifiers = false;
exports.parse = parse;
function parse(string, module, line) {
  var ast;
  try {
    ast = parser.parse(string);
  } catch(err) {
    throw _betterParserErrors(err, module, line);
  }
  return _walk(ast, module || 'main', []);
}

function _betterParserErrors(err, module, line) {
  err.errno = main.EPARSE;
  if (line) {
    err.line += line;
  }
  
  if (module) {
    err.module = module;
    err.toString = function() {
      return this.message +
        " (module: " + this.module +
        ", line: " + this.line +
        ", col: " + this.col +
        ", pos: " + this.pos +
        ")";
    }
  }
  return err;
}

function _walk(ast, module, results) {
  if (_toString.call(ast) == '[object Array]') {
    var type = ast[0],
        firstChild = ast[1],
        firstArg,
        identifier;
        
    if ((type == 'call' || type == 'new') && firstChild[0] == 'name' && firstChild[1] == 'require') {
      firstArg = ast[2][0];
      identifier = firstArg[1];
      if (firstArg[0] == 'string') {
        identifier = createIdentifier(identifier);
        if (identifier.isValid()) {
          results.push(identifier);
        } else {
          var err = new Error('Invalid module identifier: "' + identifier + '" required by "' + module + '".');
          err.errno = main.EINVAL;
          err.requiredIdentifier = identifier;
          err.module = module;
          err.identifier = module.identifier;
          throw err;
        }
      } else if (!exports.allowDynamicModuleIdentifiers) {
        var src = processor.gen_code(firstArg, true),
            err = new Error('Dynamic module identifier: "' + src + '" required by "' + module + '".');
        err.errno = main.EDYN;
        err.requiredIdentifier = src;
        err.module = module;
        err.identifier = module.identifier;
        throw err;
      }
    } else if (ast.length) {
      for (var i = 0; i < ast.length; i++) {
        _walk(ast[i], module, results);
      }
    }
  }
  return results;
}