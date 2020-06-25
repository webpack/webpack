/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const LoaderTargetPlugin = require("../LoaderTargetPlugin");
const NodeTargetPlugin = require("../node/NodeTargetPlugin");
const ChunkPrefetchPreloadPlugin = require("../prefetch/ChunkPrefetchPreloadPlugin");
const FetchCompileAsyncWasmPlugin = require("../web/FetchCompileAsyncWasmPlugin");
const FetchCompileWasmPlugin = require("../web/FetchCompileWasmPlugin");
const TargetPlugin = require("./TargetPlugin");

class TargetElectronRendererPlugin extends TargetPlugin {
	apply(compiler) {
		const { options } = this;

		if (options.target === "electron-renderer") {
			const JsonpTemplatePlugin = require("../web/JsonpTemplatePlugin");
			new JsonpTemplatePlugin().apply(compiler);
		} else if (options.target === "electron-preload") {
			const NodeTemplatePlugin = require("../node/NodeTemplatePlugin");
			new NodeTemplatePlugin({
				asyncChunkLoading: true
			}).apply(compiler);
		}
		new FetchCompileWasmPlugin({
			mangleImports: options.optimization.mangleWasmImports
		}).apply(compiler);
		new FetchCompileAsyncWasmPlugin().apply(compiler);
		new NodeTargetPlugin().apply(compiler);
		new ExternalsPlugin("commonjs", [
			"clipboard",
			"crash-reporter",
			"desktop-capturer",
			"electron",
			"ipc",
			"ipc-renderer",
			"native-image",
			"original-fs",
			"remote",
			"screen",
			"shell",
			"web-frame"
		]).apply(compiler);
		new LoaderTargetPlugin(options.target).apply(compiler);
		new ChunkPrefetchPreloadPlugin().apply(compiler);
	}
}

module.exports = TargetElectronRendererPlugin;
