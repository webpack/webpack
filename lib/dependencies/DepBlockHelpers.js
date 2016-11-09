/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DepBlockHelpers = exports;

DepBlockHelpers.getLoadDepBlockWrapper = function(depBlock, outputOptions, requestShortener, name) {
	var promiseCode = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, name);
	return [
		promiseCode + ".then(",
		").catch(",
		")"
	];
};

DepBlockHelpers.getDepBlockPromise = function(depBlock, outputOptions, requestShortener, name) {
	if(depBlock.chunks) {
		var chunks = depBlock.chunks.filter(function(chunk) {
			return !chunk.hasRuntime() && typeof chunk.id === "number";
		});
		if(chunks.length === 1) {
			var chunk = chunks[0];
			return "__webpack_require__.e" + asComment(name) + "(" + chunk.id + "" +
				(outputOptions.pathinfo && depBlock.chunkName ? "/*! " + requestShortener.shorten(depBlock.chunkName) + " */" : "") +
				asComment(depBlock.chunkReason) + ")";
		} else if(chunks.length > 0) {
			return "Promise.all" + asComment(name) + "(" +
				(outputOptions.pathinfo && depBlock.chunkName ? "/*! " + requestShortener.shorten(depBlock.chunkName) + " */" : "") +
				"[" +
				chunks.map(function(chunk) {
					return "__webpack_require__.e(" + chunk.id + ")";
				}).join(", ") +
				"])";
		}
	}
	return "Promise.resolve()";
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
