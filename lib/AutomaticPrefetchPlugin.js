/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import asyncLib from "neo-async";
import NormalModule from "./NormalModule.js";
import PrefetchDependency from "./dependencies/PrefetchDependency.js";
/** @typedef {import("./Compiler.js").default} Compiler */

const PLUGIN_NAME = "AutomaticPrefetchPlugin";

/**
 * Records modules from one compilation and adds them back as prefetch
 * dependencies in the next compilation.
 */
class AutomaticPrefetchPlugin {
	/**
	 * Registers hooks that remember previously built normal modules and enqueue
	 * them as `PrefetchDependency` requests during the next make phase.
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
		/** @type {{ context: string | null, request: string }[] | null} */
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

export default AutomaticPrefetchPlugin;

export { AutomaticPrefetchPlugin as "module.exports" };
