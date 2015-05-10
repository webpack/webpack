/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*global $hotChunkFilename$ hotAddUpdateChunk $hotMainFilename$ */
module.exports = function() {
	function hotDownloadUpdateChunk(chunkId) { // eslint-disable-line no-unused-vars
		var chunk = require("./" + $hotChunkFilename$);
		hotAddUpdateChunk(chunk.id, chunk.modules);
	}

	function hotDownloadManifest(callback) { // eslint-disable-line no-unused-vars
		try {
			var update = require("./" + $hotMainFilename$);
		} catch(e) {
			return callback();
		}
		callback(null, update);
	}
};
