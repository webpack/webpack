/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DepBlockHelpers = exports;

DepBlockHelpers.getLoadDepBlockWrapper = function(depBlock, outputOptions, requestShortener, name) {
	if(depBlock.chunk && !depBlock.chunk.entry && typeof depBlock.chunk.id === "number") {
		return [
			"__webpack_require__.e" + asComment(name) + "(" + depBlock.chunk.id + "" +
			(outputOptions.pathinfo && depBlock.chunkName ? "/*! " + requestShortener.shorten(depBlock.chunkName) + " */" : "") +
			asComment(depBlock.chunkReason) + ", ",
			")"
		];
	}
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
