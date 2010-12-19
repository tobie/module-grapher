exports.createPackageDescriptor = PackageDescriptor;
function PackageDescriptor(name, path, modules) {
  return new PackageDescriptor(name, path, modules);
}

function PackageDescriptor(name, path, modules) {
  this.name = name;
  this.path = path;
  this.modules = modules;
}

(function(p) {
})(PackageDescriptor.prototype);


