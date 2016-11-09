/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*global $hotChunkFilename$ $require$ hotAddUpdateChunk $hotMainFilename$ */
module.exports = function() {
	function hotDownloadUpdateChunk(chunkId) { // eslint-disable-line no-unused-vars
		var filename = require("path").join(__dirname, $hotChunkFilename$);
		require("fs").readFile(filename, "utf-8", function(err, content) {
			if(err) {
				if($require$.onError)
					return $require$.onError(err);
				else
					throw err;
			}
			var chunk = {};
			require("vm").runInThisContext("(function(exports) {" + content + "\n})", filename)(chunk);
			hotAddUpdateChunk(chunk.id, chunk.modules);
		});
	}

	function hotDownloadManifest(callback) { // eslint-disable-line no-unused-vars
		var filename = require("path").join(__dirname, $hotMainFilename$);
		require("fs").readFile(filename, "utf-8", function(err, content) {
			if(err) return callback();
			try {
				var update = JSON.parse(content);
			} catch(e) {
				return callback(e);
			}
			callback(null, update);
		});
	}
};
