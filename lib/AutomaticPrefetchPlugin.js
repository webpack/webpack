/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const NormalModule = require("./NormalModule");
const PrefetchDependency = require("./dependencies/PrefetchDependency");

/** @typedef {import("./Compiler")} Compiler */

const PLUGIN_NAME = "AutomaticPrefetchPlugin";

class AutomaticPrefetchPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					PrefetchDependency,
					normalModuleFactory
				);
			}
		);
		/** @type {{context: string | null, request: string}[] | null} */
		let lastModules = null;
		compiler.hooks.afterCompile.tap(PLUGIN_NAME, (compilation) => {
			lastModules = [];

			for (const m of compilation.modules) {
				if (m instanceof NormalModule) {
					lastModules.push({
						context: m.context,
						request: m.request
					});
				}
			}
		});
		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			if (!lastModules) return callback();
			asyncLib.each(
				lastModules,
				(m, callback) => {
					compilation.addModuleChain(
						m.context || compiler.context,
						new PrefetchDependency(`!!${m.request}`),
						callback
					);
				},
				(err) => {
					lastModules = null;
					callback(err);
				}
			);
		});
	}
}

module.exports = AutomaticPrefetchPlugin;
