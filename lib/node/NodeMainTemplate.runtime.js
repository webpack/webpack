/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*global installedChunks $hotChunkFilename$ hotAddUpdateChunk $hotMainFilename$ */
module.exports = function() {
	// eslint-disable-next-line no-unused-vars
	function hotDownloadUpdateChunk(chunkId) {
		var filename = require("path").join(__dirname, $hotChunkFilename$);
		var content = require("fs").readFileSync(filename, "utf-8");
		var chunk = {};
		require("vm").runInThisContext("(function(exports) {" + content + "\n})", {
			filename: filename
		})(chunk);

		hotAddUpdateChunk(chunk.id, chunk.modules);
	}

	// eslint-disable-next-line no-unused-vars
	function hotDownloadManifest() {
		try {
			var filename = require("path").join(__dirname, $hotMainFilename$);
			var content = require("fs").readFileSync(filename, "utf-8");
			var update = JSON.parse(content);
			return Promise.resolve(update);
		} catch (e) {
			return Promise.resolve();
		}
	}

	//eslint-disable-next-line no-unused-vars
	function hotDisposeChunk(chunkId) {
		delete installedChunks[chunkId];
	}
};
