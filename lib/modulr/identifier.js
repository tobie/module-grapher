exports.Identifier = Identifier;
function Identifier(identifier) {
  this.identifier = identifier;
  this.terms = identifier.split('/').filter(function(t) { return t; });
}

(function(p) {
  var TERM_REGEXP = /^([a-zA-Z]+|\.\.?)$/;
  
  p.isValid = isValid;
  function isValid() {
    return this.terms.every(_isTermValid);
  }
  
  // private
  function _isTermValid(term) {
    return TERM_REGEXP.test(term);
  }
  
  p.resolve = resolve; // or does that belong in the module?
  function resolve(otherIdentifier) {
    var otherTerms = otherIdentifier && otherIdentifier.terms;
    return this.resolveTerms(otherTerms).join('/');
  }
  
  p.resolveTerms = resolveTerms;
  function resolveTerms(terms) {
    var output = [], term;
    
    if (terms && this.isRelative()) {
      terms = terms.slice(0);
    } else {
      terms = [];
    }
    
    terms.push.apply(terms, this.terms);
    for (var i = 0, length = terms.length; i < length; i++) {
      term = terms[i];
      switch (term) {
        case '':
        case '.':
          continue;
        case '..':
          if (output.length) {
            output.pop();
          } else {
            throw new Error('Out of bounds identifier "' + this.identifier + '".');
          }
          break;
        default:
          output.push(term);
      }
    }
    return output;
  }

  p.isRelative = isRelative;
  function isRelative() {
    return /^\.\.?$/.test(this.terms[0]);
  }

  p.isTopLevel = isTopLevel;
  function isTopLevel() {
    return !this.isRelative();
  }
  
  p.toArray = toArray;
  function toArray() {
    return this.terms.slice(0);
  }
  
  p.toString = toString;
  function toString() {
    return this.terms.join('/');
  }
})(Identifier.prototype);

exports.createIdentifier = createIdentifier;
function createIdentifier(identifier) {
  return new Identifier(identifier);
}