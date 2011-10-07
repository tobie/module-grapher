exports.createPackage = createPackage;
exports.create = createPackage;
function createPackage(ident) {
  return new Package(ident);
}

exports.Package = Package;
function Package(ident) {
  if (!ident.isTopLevel()) {
    throw new TypeError('Invalid package identifier: ' + identifier);
  }

  this.identifier = ident;
  this.id = ident.toString();
}

(function(p) {
  p.searchPath = null;
  p.fullPath = null;
  p.descriptorFile = null;
  p.descriptorFileData = null;
  p.lib = null;
  p.main = null;
  p._modules = null;

  p.setDescriptorFileData = setDescriptorFileData;
  function setDescriptorFileData(data) {
    this.descriptorFileData = data;
    var directories = data && data.directories;

    this.lib = (directories && directories.lib) || './lib';
    this.main = data.main || './index';
  }
  
  p.addModule = addModule;
  function addModule(m) {
    var modules = this._modules = this._modules || {},
        id = m.id;
    if (!(id in modules)) { modules[id] = m; }
  }
  
  p.toString = toString;
  function toString() {
    return this.id;
  }
})(Package.prototype);

