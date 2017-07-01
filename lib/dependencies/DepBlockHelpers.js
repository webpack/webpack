/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DepBlockHelpers = exports;

DepBlockHelpers.getLoadDepBlockWrapper = (depBlock, outputOptions, requestShortener, name) => {
	const promiseCode = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, name);
	return [
		promiseCode + ".then(",
		").catch(",
		")"
	];
};

DepBlockHelpers.getDepBlockPromise = (depBlock, outputOptions, requestShortener, name) => {
	if(depBlock.chunks) {
		const chunks = depBlock.chunks.filter(chunk => !chunk.hasRuntime() && chunk.id !== null);
		const pathChunkCheck = outputOptions.pathinfo && depBlock.chunkName;
		const shortChunkName = requestShortener.shorten(depBlock.chunkName);
		const chunkReason = asComment(depBlock.chunkReason);
		const requireChunkId = chunk => "__webpack_require__.e(" + JSON.stringify(chunk.id) + ")";
		name = asComment(name);
		if(chunks.length === 1) {
			const chunkId = JSON.stringify(chunks[0].id);
			return `__webpack_require__.e${name}(${chunkId}${pathChunkCheck ? "/*! " + shortChunkName + " */" : ""}${chunkReason})`;
		} else if(chunks.length > 0) {
			return `Promise.all${name}(${pathChunkCheck ? "/*! " + shortChunkName + " */" : ""}[${chunks.map(requireChunkId).join(", ")}])`;
		}
	}
	return "new Promise(function(resolve) { resolve(); })";
};

function asComment(str) {
	if(!str) return "";
	return `/* ${str} */`;
}
