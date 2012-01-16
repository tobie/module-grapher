exports.normalizeExt = normalizeExt;
function normalizeExt(ext) {
  ext = ext || '';
  return ext.indexOf('.') === 0 ? ext : '.' + ext;
}
