/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ma Cheng @mc-zone
*/
"use strict";

class ReloadChunksPlugin {
	constructor(options) {
		this.options = ReloadChunksPlugin.normalizeOptions(options);
	}

	static normalizeOptions({ alternatePublicPath = "" } = {}) {
		return {
			alternatePublicPath
		};
	}

	apply(compiler) {
		const { alternatePublicPath } = this.options;
		compiler.hooks.thisCompilation.tap("ReloadChunksPlugin", compilation => {
			if (compilation.compiler !== compiler) {
				// ignore child compiler
				return;
			}
			if (compilation.mainTemplate.hooks.alternatePublicPath) {
				compilation.mainTemplate.hooks.alternatePublicPath.tap(
					"ReloadChunksPlugin",
					publicPath => {
						return alternatePublicPath;
					}
				);
			}
		});
	}
}
module.exports = ReloadChunksPlugin;
