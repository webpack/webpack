/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const LoaderTargetPlugin = require("../LoaderTargetPlugin");
const NodeTargetPlugin = require("../node/NodeTargetPlugin");
const NodeTemplatePlugin = require("../node/NodeTemplatePlugin");
const ReadFileCompileAsyncWasmPlugin = require("../node/ReadFileCompileAsyncWasmPlugin");
const ReadFileCompileWasmPlugin = require("../node/ReadFileCompileWasmPlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const TargetPlugin = require("./TargetPlugin");

class TargetNodePlugin extends TargetPlugin {
	apply(compiler) {
		const { options } = this;
		new NodeTemplatePlugin({
			asyncChunkLoading: options.target === "async-node"
		}).apply(compiler);
		new ReadFileCompileWasmPlugin({
			mangleImports: options.optimization.mangleWasmImports
		}).apply(compiler);
		new ReadFileCompileAsyncWasmPlugin().apply(compiler);
		new NodeTargetPlugin().apply(compiler);
		new LoaderTargetPlugin("node").apply(compiler);
		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: options.target === "async-node"
		}).apply(compiler);
	}
}

module.exports = TargetNodePlugin;
