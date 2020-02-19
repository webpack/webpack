/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const LoaderTargetPlugin = require("../LoaderTargetPlugin");
const NodeSourcePlugin = require("../node/NodeSourcePlugin");
const ChunkPrefetchPreloadPlugin = require("../prefetch/ChunkPrefetchPreloadPlugin");
const FetchCompileAsyncWasmPlugin = require("../web/FetchCompileAsyncWasmPlugin");
const FetchCompileWasmPlugin = require("../web/FetchCompileWasmPlugin");
const JsonpTemplatePlugin = require("../web/JsonpTemplatePlugin");
const TargetPlugin = require("./TargetPlugin");

class TargetWebPlugin extends TargetPlugin {
	apply(compiler) {
		const { options } = this;
		new JsonpTemplatePlugin().apply(compiler);
		new FetchCompileWasmPlugin({
			mangleImports: options.optimization.mangleWasmImports
		}).apply(compiler);
		new FetchCompileAsyncWasmPlugin().apply(compiler);
		new NodeSourcePlugin(options.node).apply(compiler);
		new LoaderTargetPlugin(options.target).apply(compiler);
		new ChunkPrefetchPreloadPlugin().apply(compiler);
	}
}

module.exports = TargetWebPlugin;
