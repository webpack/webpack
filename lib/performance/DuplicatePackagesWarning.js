/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../errors/WebpackError");

/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import NormalModule from "../NormalModule" */
/** @import RequestShortener from "../RequestShortener" */
/** @import { PackageCopy } from "./DuplicatePackagesPlugin" */

/**
 * @param {Module} module the module
 * @returns {string | undefined} directory of the package the module belongs to
 */
const getPackagePath = (module) => {
	const resolveData =
		/** @type {NormalModule} */
		(module).resourceResolveData;
	return resolveData && resolveData.descriptionFileRoot;
};

/**
 * Finds a module outside of the copy that pulled it into the build, so the
 * warning can name the dependency responsible for this copy.
 * @param {PackageCopy} copy the copy
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {Module | undefined} a module importing this copy, when there is one
 */
const findImporter = (copy, moduleGraph) => {
	for (const module of copy.modules) {
		for (const origin of moduleGraph
			.getIncomingConnectionsByOriginModule(module)
			.keys()) {
			if (origin && getPackagePath(origin) !== copy.path) return origin;
		}
	}
};

/**
 * Warning emitted when one package is included more than once in a build,
 * either in different versions or as several copies of the same version.
 */
class DuplicatePackagesWarning extends WebpackError {
	/**
	 * @param {string} name name of the package
	 * @param {PackageCopy[]} copies copies of the package, sorted by path
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {RequestShortener} requestShortener the request shortener
	 */
	constructor(name, copies, moduleGraph, requestShortener) {
		const versions = new Set(copies.map((copy) => copy.version));
		const headline =
			versions.size > 1
				? `Multiple versions of the package "${name}" (${[...versions].join(", ")}) are included in this build:`
				: `The package "${name}" (${copies[0].version}) is included ${copies.length} times in this build:`;
		const copiesList = copies
			.map((copy) => {
				const importer = findImporter(copy, moduleGraph);
				let message = `* ${copy.version} from ${requestShortener.shorten(copy.path)}, ${copy.modules.length} module(s)`;
				if (importer !== undefined) {
					message += `\n    Included by ${importer.readableIdentifier(requestShortener)}`;
				}
				return message;
			})
			.join("\n");
		super(`webpack performance recommendations:
${headline}
${copiesList}
Every copy is bundled separately and has its own module state, which increases the output size and can break \`instanceof\` checks and configuration shared through the package.
Align the version ranges requiring this package, or force a single version with "resolutions"/"overrides" in your package.json.`);

		/** @type {string} */
		this.name = "DuplicatePackagesWarning";
		/** @type {Module} */
		this.module = copies[0].modules[0];
	}
}

module.exports = DuplicatePackagesWarning;
