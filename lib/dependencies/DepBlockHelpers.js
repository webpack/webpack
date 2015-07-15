/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DepBlockHelpers = exports;

DepBlockHelpers.getLoadDepBlockWrapper = function(depBlock, outputOptions, requestShortener, name) {
	if(depBlock.chunks) {
		var chunks = depBlock.chunks.filter(function(chunk) {
			return !chunk.entry && typeof chunk.id === "number";
		});
		if(chunks.length === 1) {
			var chunk = chunks[0];
			return [
				"__webpack_require__.e" + asComment(name) + "(" + chunk.id + "" +
				(outputOptions.pathinfo && depBlock.chunkName ? "/*! " + requestShortener.shorten(depBlock.chunkName) + " */" : "") +
				asComment(depBlock.chunkReason) + ", ",
				")"
			];
		} else if(chunks.length > 0) {
			return [
				"(function(" + asComment(name) + ") {" +
				"var __WEBPACK_REMAINING_CHUNKS__ = " + chunks.length + ";" +
				"var __WEBPACK_CALLBACK__ = function() {" +
				"if(--__WEBPACK_REMAINING_CHUNKS__ < 1) (",

				"(__webpack_require__));" +
				"};" +
				chunks.map(function(chunk) {
					return "__webpack_require__.e(" + chunk.id + ", __WEBPACK_CALLBACK__);";
				}).join("") +
				"}())"
			];
		}
	}
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
