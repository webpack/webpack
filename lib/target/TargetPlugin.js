/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const memorize = require("../util/memorize");

const requireClassMap = new Map([
	["web", memorize(() => require("./TargetWebPlugin"))],
	["webworker", memorize(() => require("./TargetWebWorkerPlugin"))],
	["node", memorize(() => require("./TargetNodePlugin"))],
	["async-node", memorize(() => require("./TargetNodePlugin"))],
	["node-webkit", memorize(() => require("./TargetNodeWebkitPlugin"))],
	["electron-main", memorize(() => require("./TargetElectronMainPlugin"))],
	[
		"electron-renderer",
		memorize(() => require("./TargetElectronRendererPlugin"))
	],
	[
		"electron-preload",
		memorize(() => require("./TargetElectronRendererPlugin"))
	]
]);

class TargetPlugin {
	static getPluginClass(target) {
		const requireClass = requireClassMap.get(target);

		if (!requireClass) {
			throw new Error("Unsupported target '" + target + "'.");
		}

		return requireClass();
	}

	constructor(options) {
		this.options = options;
	}
}

module.exports = TargetPlugin;
