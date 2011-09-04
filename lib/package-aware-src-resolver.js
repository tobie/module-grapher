/*
  When attempting to resolve a particular module, this
  resolver will first look to see if there's a corresponding
  existing package. So for example, when looking for a module
  with id `foo/bar/baz`, the resolver will first check to see
  if there's a package named `foo` in any of the provided
  paths (i.e. it will look for a descriptor file
  "./foo/package.json" in each path).
  
  It will the proceed to look for the relative path to the lib
  directory in the descriptor file's `directories.lib` property,
  defaulting to "./lib" if none is specified (as per the CJS
  spec). So in our previous example, if the corresponding
  descriptor file is found in the search path "./vendor" and
  its `directories.lib` property is "./source/js/", the resolver
  will look for the module here:
  
      ".../vendor/foo/source/js/bar/baz.js"
         '-------''--''--------''------''--'
            |     |       |        |      \--- extensions
         search   |   directories  |
          path    |      lib       |
               package        relative module
                 id               path
  
  Note that it will try the other specified extensions and also
  ".../vendor/foo/js/src/bar/baz/index[.js, etc.]" if the
  relevant option is set to true.
  
  Importantly, this implies package precedence. If you have the
  following search paths array: ["./lib", "./vendor"] and the
  following dir structure:
  
      root/
        '-- lib/
        |    '-- foo/
        |         '-- main.js
        |
        '-- vendor/
             '-- foo/
                  |-- package.json
                  '-- lib/
                       '-- main.js
  
  
  A module with id `foo/main` will point to
  "root/vendor/foo/lib/main.js". This is necessary to maintain
  package integrity. If this is not the behaviour you are
  expecting you should use another package resolver that doesn't
  inforce package precedence, or you should rename non-packages
  so that they do not conflict with packages.
*/

var util = require('util'),
    path = require('path'),
    pathHelpers = require('./path-helpers'),
    fs = require('fs'),
    serialize = require('async-it').serial,
    errors = require('./errors'),
    identifier = require('./identifier'),
    pckg = require('./package'),
    SrcResolver = require('./src-resolver').SrcResolver;


exports.createPackageAwareSrcResolver = createPackageAwareSrcResolver;
exports.create = createPackageAwareSrcResolver;
function createPackageAwareSrcResolver(config) {
  return new PackageAwareSrcResolver(config);
}

exports.PackageAwareSrcResolver = PackageAwareSrcResolver;
function PackageAwareSrcResolver(config) {
  SrcResolver.call(this, config);
  this.packageCache = {};
}

util.inherits(PackageAwareSrcResolver, SrcResolver);

(function(p) {
  p.resolve = resolve;
  function resolve(module, callback) {
    var self = this;
    
    this.getPackageForModule(module, function(err, pckg) {
      if (err) {
        callback(err);
      } else if (pckg) {
        // Create the path based on the pckg object.
        var relativePath;
        if (module.id === pckg.id) {
          // For require statement of the form require('foo') we
          // want the package's entry point (`main` property of the
          // pckg object).
          relativePath = path.join(pckg.id, pckg.main);
        } else {
          // The require statement is of the form require('foo/bar/baz') we
          // want the package's lib directory.
          // So if pckg.lib is "./src", relativePath will look like:
          // "foo/src/bar/baz".
          var identifiers = path.join.apply(path, module.identifier.terms.slice(1));
          relativePath = path.join(pckg.id, pckg.lib, identifiers);
        }
        self.resolvePath(relativePath, module, function(err) {
          if (err) {
            callback(err);
          } else {
            module.setPackage(pckg);
            callback(null);
          }
        });
      } else {
        // This module isn't part of a package. Look it up the
        // normal way.
        SrcResolver.prototype.resolve.call(self, module, callback);
      }
    });
  }
  
  p.getPackageForModule = getPackageForModule;
  function getPackageForModule(module, callback) {
    var self = this,
        id = module.identifier.terms[0],
        packageCache = this.packageCache;

    if (id in packageCache) {
      process.nextTick(function() {
        callback(null, packageCache[id]);
      });
    } else {
      // Iterate over each paths supplied in `config`.
      serialize.forEach(this.paths, function(currentPath, checkNextPath) {
        var p = path.resolve(self.root, currentPath, id),
            descriptorFile = path.join(p, 'package.json');
        fs.readFile(descriptorFile, 'utf8', function(err, data) {
          if (err) {
            // No package.json file, here. Check in next search path.
            checkNextPath();
          } else {
            try {
              data = JSON.parse(data);
            } catch(err) {
              // Malformed package.json file. Exit.
              err = errors.wrapEJSON(err, module, descriptorFile);
              callback(err);
            }
            var ident = identifier.create(id),
                pckgInst = pckg.create(ident);
    
            pckgInst.searchPath = currentPath;
            pckgInst.fullPath = p;
            pckgInst.descriptorFile = descriptorFile;
            pckgInst.setDescriptorFileData(data);
            packageCache[id] = pckgInst;
            callback(null, pckgInst);
          }
        });
      }, function() {
        // Couldn't find a package descriptor file in 
        // any of the supplied paths. We're not dealing 
        // with a package.
        // Cache it anyway so we avoid the lookup next time.
        packageCache[id] = null;
        callback(null, null);
      });
    }
  }
})(PackageAwareSrcResolver.prototype);