exports.loadChunk = function(id, cb) {
	require(["./file" + id], function(result) {
		cb(result);
	});
};
exports.nextTick = process.nextTick;
exports.fs = require("fs");