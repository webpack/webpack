/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../InitFragment").GenerateContext} GenerateContext */
/** @typedef {number} InitFragmentStage */

/**
 * @extends {InitFragment<GenerateContext>}
 */
class ExternalModuleInitFragment extends InitFragment {
	/**
	 * @param {string} module module path
	 * @param {{ name: string, value: string }[]} importSpecifiers import specifiers
	 * @param {string | undefined} defaultImport default import
	 * @param {boolean=} isLazy is this a lazy-loaded external module
	 * @param {string=} externalResource path to the external resource
	 */
	constructor(
		module,
		importSpecifiers,
		defaultImport,
		isLazy = false,
		externalResource = undefined
	) {
		// Keep the original behavior for non-lazy modules
		if (!isLazy) {
			const defineConst =
				importSpecifiers.length === 0 && defaultImport === undefined;

			const content = [
				`var __WEBPACK_EXTERNAL_MODULE_${module.replace(/[^\w]/g, "_")}__ = require(${JSON.stringify(module)});`
			];

			if (!defineConst) {
				for (const { name, value } of importSpecifiers) {
					content.push(
						`var ${name} = __WEBPACK_EXTERNAL_MODULE_${module.replace(
							/[^\w]/g,
							"_"
						)}__${value};`
					);
				}
				if (defaultImport !== undefined)
					content.push(
						`var ${defaultImport} = __WEBPACK_EXTERNAL_MODULE_${module.replace(
							/[^\w]/g,
							"_"
						)}__;`
					);
			}

			super(
				content.join("\n"),
				InitFragment.STAGE_CONSTANTS,
				1,
				`external module ${module}`
			);
			this.module = module;
			this.importSpecifiers = importSpecifiers;
			this.defaultImport = defaultImport;
			this.isLazy = false;
			this.defineConst = defineConst;
			return;
		}

		// New behavior for lazy modules
		const defineConst =
			importSpecifiers.length === 0 && defaultImport === undefined;
		const moduleName = `__WEBPACK_EXTERNAL_MODULE_${module.replace(/[^\w]/g, "_")}__`;

		const content = [
			`// Lazy-loaded external module: ${module}`,
			`var ${moduleName}_promise = new Promise(function(resolve) {`,
			`  if (typeof ${moduleName} !== "undefined") return resolve(${moduleName});`,
			`  ${RuntimeGlobals.loadScript}(${JSON.stringify(externalResource)}, function() {`,
			`    var external = require(${JSON.stringify(module)});`,
			`    ${moduleName} = external;`,
			`    resolve(external);`,
			`  });`,
			`});`,
			`var ${moduleName} = undefined; // Will be populated after load`
		];

		if (!defineConst) {
			// For named imports, create promise-based accessors
			for (const { name, value } of importSpecifiers) {
				content.push(
					`Object.defineProperty(exports, "${name}", {`,
					`  enumerable: true,`,
					`  get: function() {`,
					`    return ${moduleName}${value};`,
					`  }`,
					`});`
				);
			}
			// For default import
			if (defaultImport !== undefined) {
				content.push(`var ${defaultImport} = ${moduleName}_promise;`);
			}
		}

		super(
			content.join("\n"),
			InitFragment.STAGE_CONSTANTS,
			1,
			`external module ${module}`
		);
		this.module = module;
		this.importSpecifiers = importSpecifiers;
		this.defaultImport = defaultImport;
		this.isLazy = isLazy;
		this.externalResource = externalResource;
		this.defineConst = defineConst;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {boolean} true, if the external module is used by the chunk
	 */
	merge(chunk, chunkGraph) {
		return true;
	}
}

module.exports = ExternalModuleInitFragment;
