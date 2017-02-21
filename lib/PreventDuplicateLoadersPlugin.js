/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Luciano Graziani @LucianoGraziani
*/
"use strict";

/**
 * Transform string options to object so is possible to compare them
 * @param  {string} stringOptions  Options
 * @return {object}                Options
 */
function transformStringOptionsToObject(stringOptions) {
	if(typeof stringOptions !== "string") return stringOptions ? stringOptions : {};

	const keyValues = stringOptions.split("&");
	const keyValueMaps = keyValues.map(keyValue => keyValue.split("="));
	const options = keyValueMaps.reduce((options, map) => {
		options[map[0]] = map[1];

		return options;
	}, {});

	return options;
}

/**
 * Check if two simple objects contains the same key/value values
 * @param  {object} options1  First options
 * @param  {object} options2  Second options
 * @return {boolean}          Resultant comparison
 */
function areOptionsEquals(options1, options2) {
	// Create arrays of property names
	const options1Props = Object.getOwnPropertyNames(options1);
	const options2Props = Object.getOwnPropertyNames(options2);

	if(options1Props.length !== options2Props.length) {
		return false;
	}
	for(let i = 0; i < options1Props.length; i++) {
		const propName = options1Props[i];

		if(options1[propName] !== options2[propName]) {
			return false;
		}
	}

	return true;
}

class PreventDuplicateLoadersPlugin {
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
						options: transformStringOptionsToObject(loader.options),
					})
				);
				const loader = loaders.reduce((resultantLoader, loader, idx) => {
					if(resultantLoader.hasMoreThanOneInstance) return resultantLoader;

					let loader2Options;
					const hasMoreThanOneInstance = loaders.filter((loader2, idx2) => {
						// This function isn't pure, but is faster than write two functions
						if(idx !== idx2) {
							loader2Options = loader2.options;
						}
						return loader.path === loader2.path;
					}).length > 1;

					const hasSameOptions = hasMoreThanOneInstance
																		? areOptionsEquals(loader.options, loader2Options)
																		: false;

					return {
						name: loader.name,
						hasMoreThanOneInstance,
						hasSameOptions,
					};
				}, { name: null, hasMoreThanOneInstance: false, hasSameOptions: false });

				if(loader.hasMoreThanOneInstance) {
					if(loader.hasSameOptions) {
						loaderContext.emitError(new Error(`\`${loader.name}\` was applied multiple times on \`${module.rawRequest}\``));
					} else {
						loaderContext.emitWarning(`\`${loader.name}\` was applied multiple times on \`${module.rawRequest}\`, but with different options`);
					}
				}
			});
		});
	}
}

module.exports = PreventDuplicateLoadersPlugin;
