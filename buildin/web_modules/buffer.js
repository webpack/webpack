/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Buffer() {
	throw new Error("Buffer is not included in webpack by default. Add an alias 'buffer' = 'buffer-browserify'.");
}
Buffer.isBuffer = function() {
  return false;
};

exports.INSPECT_MAX_BYTES = 50;
exports.SlowBuffer = Buffer;
exports.Buffer = Buffer;
