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
  this.allowDynamicModuleIdentifiers = !!config.allowDynamicModuleIdentifiers;
  this.walker = processor.ast_walker();
}

(function(p) {
  p.parse = parse;
  function parse(str, module) {
    var ast;
    try {
      ast = parser.parse(str);
      module.ast = ast;
    } catch(err) {
      err.errno = errors.EPARSE;
      err.module = module;
      err.toString = function() {
        return this.message + " (module: " + this.module +
          ", line: " + this.line + ", col: " + this.col +
          ", pos: " + this.pos + ")";
      }
      throw err;
    }

    return this.walk(ast, module);
  }

  p.walk = walk;
  function walk(ast, module) {
    var self = this,
        results = [];
    
    function handleExpr(expr, args) {
      if (expr[0] == "name" && expr[1] == "require") {
        var firstArg = args[0];

        // Check if the call to require has arguments.
        if (!firstArg) {
          var err = new Error('Empty require call in module "' + module + '".');
          err.errno = errors.EEMPTY;
          err.module = module;
          throw err;
        }

        // Check if the first argument (the identifier) is a string.
        if (firstArg[0] == 'string') {
          // Build an identifier object to check for validity.
          var ident = identifier.create(firstArg[1]);

          // If the identifier is not valid, throw.
          if (!ident.isValid()) {
            var msg = 'Invalid module identifier: "' + ident + '" required by "' + module + '".',
                err = new Error(msg);
            err.errno = errors.EINVAL;
            err.identifier = ident;
            err.module = module;
            throw err;
          }

          results.push(ident);
          return;
        }

        // Next see if dynamic identifiers are allowed.
        // Dynamic identifiers might be useful to require modules
        // at runtime but breaks static analysis.
        if (self.allowDynamicModuleIdentifiers) {
          // Can't handle it, so just return.
          // TODO: log a warning.
          return;
        }
        
        // If dynamic identifiers aren't allowed, throw.
        // Get actual source code to throw more meaningful errors.
        ident = processor.gen_code(firstArg);
        var msg = 'Dynamic module identifier: "' + ident + '" required by "' + module + '".',
            err = new Error(msg);
        err.errno = errors.EDYN;
        err.identifier = ident;
        err.module = module;
        throw err;
      }
    }

    this.walker.with_walkers({
      "new": handleExpr,
      "call": handleExpr
    }, function() { return  self.walker.walk(ast); });

    return results;
  }
})(Parser.prototype);