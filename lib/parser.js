var errors = require('./errors'),
    uglify = require('uglify-js'),
    processor = uglify.uglify,
    parser = uglify.parser,
    identifier = require('./identifier');

var _toString = Object.prototype.toString;

exports.createParser = createParser;
exports.create = createParser;
function createParser(config) {
  return new Parser(config);
}

exports.Parser = Parser;
function Parser(config) {
  this.allowDynamicModuleIdentifiers = config.allowDynamicModuleIdentifiers;
}

(function(p) {
  p.parse = parse;
  function parse(str, module) {
    var ast;
    try {
      ast = parser.parse(str);
    } catch(err) {
      throw errors.wrapEPARSE(err, module);
    }
    return this.walk(ast, module, []);
  }
  
  p.walk = walk;
  function walk(ast, module, results) {
    if (_toString.call(ast) == '[object Array]') {
      var type = ast[0],
          firstChild = ast[1],
          firstArg,
          requiredIdentifier;

      if ((type == 'call' || type == 'new') && firstChild[0] == 'name' && firstChild[1] == 'require') {
        firstArg = ast[2][0];
        requiredIdentifier = firstArg[1];
        if (firstArg[0] == 'string') {
          requiredIdentifier = identifier.create(requiredIdentifier);
          if (requiredIdentifier.isValid()) {
            results.push(requiredIdentifier);
          } else {
            throw errors.createEINVAL(requiredIdentifier, module);
          }
        } else if (!this.allowDynamicModuleIdentifiers) {
          var src = processor.gen_code(firstArg, true);
          throw errors.createEDYN(src, requiredIdentifier);
        }
      } else if (ast.length) {
        for (var i = 0, length = ast.length; i < length; i++) {
          this.walk(ast[i], module, results);
        }
      }
    }
    return results;
  }
})(Parser.prototype);