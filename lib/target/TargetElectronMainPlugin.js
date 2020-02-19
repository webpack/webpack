/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");
const LoaderTargetPlugin = require("../LoaderTargetPlugin");
const NodeTargetPlugin = require("../node/NodeTargetPlugin");
const NodeTemplatePlugin = require("../node/NodeTemplatePlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const TargetPlugin = require("./TargetPlugin");

class TargetElectronMainPlugin extends TargetPlugin {
	apply(compiler) {
		const { options } = this;
		new NodeTemplatePlugin({
			asyncChunkLoading: true
		}).apply(compiler);
		new NodeTargetPlugin().apply(compiler);
		new ExternalsPlugin("commonjs", [
			"app",
			"auto-updater",
			"browser-window",
			"clipboard",
			"content-tracing",
			"crash-reporter",
			"dialog",
			"electron",
			"global-shortcut",
			"ipc",
			"ipc-main",
			"menu",
			"menu-item",
			"native-image",
			"original-fs",
			"power-monitor",
			"power-save-blocker",
			"protocol",
			"screen",
			"session",
			"shell",
			"tray",
			"web-contents"
		]).apply(compiler);
		new LoaderTargetPlugin(options.target).apply(compiler);
		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: true
		}).apply(compiler);
	}
}

module.exports = TargetElectronMainPlugin;
