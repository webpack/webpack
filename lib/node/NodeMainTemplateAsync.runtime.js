/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*global installedChunks $hotChunkFilename$ $require$ hotAddUpdateChunk $hotMainFilename$ */
module.exports = function() {
	function hotDownloadUpdateChunk(chunkId) { // eslint-disable-line no-unused-vars
		var filename = require("path").join(__dirname, $hotChunkFilename$);
		require("fs").readFile(filename, "utf-8", function(err, content) {
			if(err) {
				if($require$.onError)
					return $require$.oe(err);
				else
					throw err;
			}
			var chunk = {};
			require("vm").runInThisContext("(function(exports) {" + content + "\n})", filename)(chunk);
			hotAddUpdateChunk(chunk.id, chunk.modules);
		});
	}

	function hotDownloadManifest() { // eslint-disable-line no-unused-vars
		var filename = require("path").join(__dirname, $hotMainFilename$);
		return new Promise(function(resolve, reject) {
			require("fs").readFile(filename, "utf-8", function(err, content) {
				if(err) return resolve();
				try {
					var update = JSON.parse(content);
				} catch(e) {
					return reject(e);
				}
				resolve(update);
			});
		});
	}

	function hotDisposeChunk(chunkId) {
		delete installedChunks[chunkId];
	}
};
