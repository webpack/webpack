/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const LoaderTargetPlugin = require("../LoaderTargetPlugin");
const NodeSourcePlugin = require("../node/NodeSourcePlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const FetchCompileAsyncWasmPlugin = require("../web/FetchCompileAsyncWasmPlugin");
const FetchCompileWasmPlugin = require("../web/FetchCompileWasmPlugin");
const WebWorkerTemplatePlugin = require("../webworker/WebWorkerTemplatePlugin");
const TargetPlugin = require("./TargetPlugin");

class TargetWebWorkerPlugin extends TargetPlugin {
	apply(compiler) {
		const { options } = this;
		new WebWorkerTemplatePlugin().apply(compiler);
		new FetchCompileWasmPlugin({
			mangleImports: options.optimization.mangleWasmImports
		}).apply(compiler);
		new FetchCompileAsyncWasmPlugin().apply(compiler);
		new NodeSourcePlugin(options.node).apply(compiler);
		new LoaderTargetPlugin(options.target).apply(compiler);
		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: true
		}).apply(compiler);
	}
}

module.exports = TargetWebWorkerPlugin;
