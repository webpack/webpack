/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

const DepBlockHelpers = exports;

DepBlockHelpers.getLoadDepBlockWrapper = (depBlock, runtimeTemplate, name) => {
	const promiseCode = DepBlockHelpers.getDepBlockPromise(depBlock, runtimeTemplate, name);
	return [
		promiseCode + ".then(",
		").catch(",
		")"
	];
};

DepBlockHelpers.getDepBlockPromise = (depBlock, runtimeTemplate, name) => {
	if(depBlock.chunks) {
		const chunks = depBlock.chunks.filter(chunk => !chunk.hasRuntime() && chunk.id !== null);
		const pathChunkCheck = runtimeTemplate.outputOptions.pathinfo && depBlock.chunkName;
		const shortChunkName = runtimeTemplate.requestShortener.shorten(depBlock.chunkName);
		const chunkReason = Template.toNormalComment(depBlock.chunkReason);
		const requireChunkId = chunk => "__webpack_require__.e(" + JSON.stringify(chunk.id) + ")";
		name = Template.toNormalComment(name);
		if(chunks.length === 1) {
			const chunkId = JSON.stringify(chunks[0].id);
			return `__webpack_require__.e${name}(${chunkId}${pathChunkCheck ? Template.toComment(shortChunkName) : ""}${chunkReason})`;
		} else if(chunks.length > 0) {
			return `Promise.all${name}(${pathChunkCheck ? Template.toComment(shortChunkName) : ""}[${chunks.map(requireChunkId).join(", ")}])`;
		}
	}
	return "Promise.resolve()";
};
