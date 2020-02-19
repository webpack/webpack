/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const LoaderTargetPlugin = require("../LoaderTargetPlugin");
const NodeTargetPlugin = require("../node/NodeTargetPlugin");
const ChunkPrefetchPreloadPlugin = require("../prefetch/ChunkPrefetchPreloadPlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const JsonpTemplatePlugin = require("../web/JsonpTemplatePlugin");
const TargetPlugin = require("./TargetPlugin");

class TargetNodeWebkitPlugin extends TargetPlugin {
	apply(compiler) {
		const { options } = this;
		new JsonpTemplatePlugin().apply(compiler);
		new NodeTargetPlugin().apply(compiler);
		new ExternalsPlugin("commonjs", "nw.gui").apply(compiler);
		new LoaderTargetPlugin(options.target).apply(compiler);
		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: true
		}).apply(compiler);
		new ChunkPrefetchPreloadPlugin().apply(compiler);
	}
}

module.exports = TargetNodeWebkitPlugin;
