function _createError(errno, msg, module) {
  var err = new Error(msg);
  err.module = module || null;
  err.identifier = module ? module.identifier : null;
  err.errno = errno;
  return err;
}

function _createErrorIdent(errno, msg, identifier) {
  var err = new Error(msg);
  err.identifier = identifier || null;
  err.errno = errno;
  return err;
}

exports.EPATH = {}; // can't resolve path
exports.createEPATH = createEPATH;
function createEPATH(module) {
  var msg = 'Cannot resolve path for module: "' + module + '".';
  return _createError(exports.EPATH, msg, module);
}

exports.EBOUNDS = {}; // out of bounds identifier
exports.createEBOUNDS = createEBOUNDS;
function createEBOUNDS(identifier) {
  var msg = 'Out of bounds identifier: "' + identifier + '".';
  return _createErrorIdent(exports.EBOUNDS, msg, identifier);
}

exports.EMISSING = {}; // missing module
exports.createEMISSING = createEMISSING;
function createEMISSING(module) {
  var msg = 'Cannot load module: "' + module + '".';
  return _createError(exports.EMISSING, msg, module);
}

exports.EUNRES = {}; // unresolved identifier
exports.createEUNRES = createEUNRES;
function createEUNRES(identifier) {
  var msg = 'Cannot instantiate Module from unresolved identifier: "' + identifier + '".';
  return _createErrorIdent(exports.EUNRES, msg, identifier);
}

exports.EINVAL = {}; // invalid identifier
exports.createEINVAL = createEINVAL;
function createEINVAL(requiredIdentifier, module) {
  var msg = 'Invalid module identifier: "' + requiredIdentifier + '" required by "' + module + '".';
  var err = _createError(exports.EINVAL, msg, module);
  err.requiredIdentifier = requiredIdentifier;
  return err;
}

exports.EDYN = {}; // dynamic identifier
exports.createEDYN = createEDYN;
function createEDYN(requiredIdentifier, module) {
  var msg = 'Dynamic module identifier: "' + requiredIdentifier + '" required by "' + module + '".';
  var err = _createError(exports.EDYN, msg, module);
  err.requiredIdentifier = requiredIdentifier;
  return err;
}

exports.EPARSE = {}; // parse error
exports.wrapEPARSE = wrapEPARSE;
function wrapEPARSE(err, module) {
  err.errno = exports.EPARSE;
  if (module) {
    err.module = module;
    err.identifier = module.identifier;
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
