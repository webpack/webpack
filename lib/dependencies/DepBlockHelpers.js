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
				asComment(depBlock.chunkReason) + ").then(",
				").catch(function(err) { __webpack_require__.oe(err); })"
			];
		} else if(chunks.length > 0) {
			return [
				"(function(" + asComment(name) + ") { " +
				"var __WEBPACK_CALLBACK__ = ",

				"; Promise.all([" +
				chunks.map(function(chunk) {
					return "__webpack_require__.e(" + chunk.id + ")";
				}).join(", ") +
				"])" +
				".then(__WEBPACK_CALLBACK__)" +
				".catch(function(err) { __webpack_require__.oe(err); }); " +
				"}())"
			];
		}
	}
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
