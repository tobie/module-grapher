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
    // In Uglify, the expressions we're interested (or might contain
    // expressions we're interested in) are all subclasses of Array.
    if (_toString.call(ast) == '[object Array]') {
      var type = ast[0],
          firstChild = ast[1],
          firstArg,
          ident;

      // Find expressions of the form: `...require(arg)...` and
      // `...new require(arg)...`.
      // All expression but calling constuctors with the `new`
      // keyword follow the first form.
      if ((type == 'call' || type == 'new') && firstChild[0] == 'name' && firstChild[1] == 'require') {
        firstArg = ast[2][0];
        ident = firstArg[1];

        // Check if the first argument (the identifier) is a string.
        if (firstArg[0] == 'string') {
          // Build an identifier object to check for validity.
          ident = identifier.create(ident);
          if (ident.isValid()) {
            results.push(ident);
          } else {
            throw errors.createEINVAL(ident, module);
          }
        // If not, see if dynamic identifiers are allowed.
        // Dynamic identifiers might be useful to require modules
        // at runtime but breaks static analysis.
        } else if (!this.allowDynamicModuleIdentifiers) {
          // Get actual source code to throw more meaningful errors.
          var src = processor.gen_code(firstArg, true);
          throw errors.createEDYN(src, module);
        }
      // Traverse the tree.
      } else if (ast.length) {
        for (var i = 0, length = ast.length; i < length; i++) {
          this.walk(ast[i], module, results);
        }
      }
    }
    return results;
  }
})(Parser.prototype);