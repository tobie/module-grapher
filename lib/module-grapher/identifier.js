var main = require('../module-grapher');

exports.Identifier = Identifier;
function Identifier(terms) {
  if (typeof terms == 'string') {
    terms = terms.split('/');
  }
  this.terms = terms.filter(function(t) { return t; });
}

(function(p) {
  var TERM_REGEXP = /^([a-zA-Z0-9-_$]+|\.\.?)$/;
  
  p.isValid = isValid;
  function isValid() {
    return this.terms.every(_isTermValid);
  }
  
  function _isTermValid(term) {
    return TERM_REGEXP.test(term);
  }
  
  p.resolve = resolve;
  function resolve(otherIdentifier) {
    if (this.isTopLevel()) {
      return this.clone();
    }
    
    var otherTerms = otherIdentifier ? otherIdentifier.getDirTerms() : [],
        terms = this.resolveTerms(otherTerms);
    return createIdentifier(terms);
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
            var err = new Error('Out of bounds identifier: "' + this + '".');
            err.errno = main.EBOUNDS;
            err.identifier = this;
            throw err;
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
    return (/^\.\.?$/).test(this.terms[0]);
  }

  p.isTopLevel = isTopLevel;
  function isTopLevel() {
    return !this.isRelative();
  }
  
  p.toArray = toArray;
  function toArray() {
    return this.terms.slice(0);
  }
  
  p.clone = clone;
  function clone() {
    return createIdentifier(this.terms.slice(0));
  }
  
  p.getDirTerms = getDirTerms;
  function getDirTerms() {
    var t = this.terms;
    return t.slice(0, t.length - 1);
  }
  
  p.toString = toString;
  function toString() {
    return this.terms.join('/');
  }
})(Identifier.prototype);

exports.createIdentifier = createIdentifier;
function createIdentifier(terms) {
  return new Identifier(terms);
}