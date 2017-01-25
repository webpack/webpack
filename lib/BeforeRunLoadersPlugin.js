/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Luciano Graziani @LucianoGraziani
*/
"use strict";

class BeforeRunLoadersPlugin {

	/**
	 * Before run loaders you want to check if the same loader was invoked more than one time.
	 * If it's true, you want to throw an Error.
	 *
	 * @param  {Compiler} compiler   the Compiler instance
	 * @throws {Error} If it requires a loader more than one time per dependency
	 * @return {void}
	 */
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("normal-module-loader", (loaderContext, module) => {
				const loaders = module.loaders.map(
					loader => ({
						name: loader.loader.split(/(\\|\/)/).filter(loader => /(-loader|loader.js)$/.test(loader))[0],
						path: loader.loader,
					})
				);
				const loader = loaders.reduce((resultantLoader, loader) => {
					if(resultantLoader.hasMoreThanOneInstance) return resultantLoader;

					return {
						name: loader.name,
						hasMoreThanOneInstance: loaders.filter(loader2 => loader.path === loader2.path).length > 1,
					};
				}, { name: null, hasMoreThanOneInstance: false });

				if(loader.hasMoreThanOneInstance) {
					loaderContext.emitError(new Error(`You're applying "${loader.name}" multiple times, don't do that man!`));
				}
			});
		});
	}
}

module.exports = BeforeRunLoadersPlugin;
