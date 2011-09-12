exports.EINVALPKG = {}; // invalid package identifier
exports.createEINVALPKG = createEINVALPKG;
function createEINVALPKG(identifier) {
  var msg = 'Invalid package identifier: "' + identifier + '".';
  var err = new Error(msg);
  err.identifier = identifier;
  err.errno = exports.EINVALPKG;
  return err;
}

exports.EJSON = {}; // JSON parse error
exports.wrapEJSON = wrapEJSON;
function wrapEJSON(err, module, descFile) {
  err.errno = exports.EJSON;
  err.module = module;
  err.identifier = module.identifier;
  err.message = 'Malformed JSON in descriptor file "' + descFile + '": ' + err.message;
  return err;
}

