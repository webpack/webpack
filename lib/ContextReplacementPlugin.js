/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ContextElementDependency = require("./dependencies/ContextElementDependency");
const { join } = require("./util/fs");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./ContextModule").ContextModuleOptions} ContextModuleOptions */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/** @typedef {Record<string, string>} NewContentCreateContextMap */

const PLUGIN_NAME = "ContextReplacementPlugin";

class ContextReplacementPlugin {
	/**
	 * @param {RegExp} resourceRegExp A regular expression that determines which files will be selected
	 * @param {(string | ((context: TODO) => void) | RegExp | boolean)=} newContentResource A new resource to replace the match
	 * @param {(boolean | NewContentCreateContextMap | RegExp)=} newContentRecursive If true, all subdirectories are searched for matches
	 * @param {RegExp=} newContentRegExp A regular expression that determines which files will be selected
	 */
	constructor(
		resourceRegExp,
		newContentResource,
		newContentRecursive,
		newContentRegExp
	) {
		this.resourceRegExp = resourceRegExp;

		// new webpack.ContextReplacementPlugin(/selector/, (context) => { /* Logic */ });
		if (typeof newContentResource === "function") {
			this.newContentCallback = newContentResource;
		}
		// new ContextReplacementPlugin(/selector/, './folder', { './request': './request' });
		else if (
			typeof newContentResource === "string" &&
			typeof newContentRecursive === "object"
		) {
			this.newContentResource = newContentResource;
			/**
			 * @param {InputFileSystem} fs input file system
			 * @param {(err: null | Error, newContentRecursive: NewContentCreateContextMap) => void} callback callback
			 */
			this.newContentCreateContextMap = (fs, callback) => {
				callback(
					null,
					/** @type {NewContentCreateContextMap} */ (newContentRecursive)
				);
			};
		}
		// new ContextReplacementPlugin(/selector/, './folder', (context) => { /* Logic */ });
		else if (
			typeof newContentResource === "string" &&
			typeof newContentRecursive === "function"
		) {
			this.newContentResource = newContentResource;
			this.newContentCreateContextMap = newContentRecursive;
		} else {
			// new webpack.ContextReplacementPlugin(/selector/, false, /reg-exp/);
			if (typeof newContentResource !== "string") {
				newContentRegExp = /** @type {RegExp} */ (newContentRecursive);
				newContentRecursive = /** @type {boolean} */ (newContentResource);
				newContentResource = undefined;
			}
			// new webpack.ContextReplacementPlugin(/selector/, /de|fr|hu/);
			if (typeof newContentRecursive !== "boolean") {
				newContentRegExp = /** @type {RegExp} */ (newContentRecursive);
				newContentRecursive = undefined;
			}
			// new webpack.ContextReplacementPlugin(/selector/, './folder', false, /selector/);
			this.newContentResource =
				/** @type {string | undefined} */
				(newContentResource);
			this.newContentRecursive =
				/** @type {boolean | undefined} */
				(newContentRecursive);
			this.newContentRegExp =
				/** @type {RegExp | undefined} */
				(newContentRegExp);
		}
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const resourceRegExp = this.resourceRegExp;
		const newContentCallback = this.newContentCallback;
		const newContentResource = this.newContentResource;
		const newContentRecursive = this.newContentRecursive;
		const newContentRegExp = this.newContentRegExp;
		const newContentCreateContextMap = this.newContentCreateContextMap;

		compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
			cmf.hooks.beforeResolve.tap(PLUGIN_NAME, result => {
				if (!result) return;
				if (resourceRegExp.test(result.request)) {
					if (newContentResource !== undefined) {
						result.request = newContentResource;
					}
					if (newContentRecursive !== undefined) {
						result.recursive = newContentRecursive;
					}
					if (newContentRegExp !== undefined) {
						result.regExp = newContentRegExp;
					}
					if (typeof newContentCallback === "function") {
						newContentCallback(result);
					} else {
						for (const d of result.dependencies) {
							if (d.critical) d.critical = false;
						}
					}
				}
				return result;
			});
			cmf.hooks.afterResolve.tap(PLUGIN_NAME, result => {
				if (!result) return;
				if (resourceRegExp.test(result.resource)) {
					if (newContentResource !== undefined) {
						if (
							newContentResource.startsWith("/") ||
							(newContentResource.length > 1 && newContentResource[1] === ":")
						) {
							result.resource = newContentResource;
						} else {
							result.resource = join(
								/** @type {InputFileSystem} */ (compiler.inputFileSystem),
								result.resource,
								newContentResource
							);
						}
					}
					if (newContentRecursive !== undefined) {
						result.recursive = newContentRecursive;
					}
					if (newContentRegExp !== undefined) {
						result.regExp = newContentRegExp;
					}
					if (typeof newContentCreateContextMap === "function") {
						result.resolveDependencies =
							createResolveDependenciesFromContextMap(
								newContentCreateContextMap
							);
					}
					if (typeof newContentCallback === "function") {
						const origResource = result.resource;
						newContentCallback(result);
						if (
							result.resource !== origResource &&
							!result.resource.startsWith("/") &&
							(result.resource.length <= 1 || result.resource[1] !== ":")
						) {
							// When the function changed it to an relative path
							result.resource = join(
								/** @type {InputFileSystem} */ (compiler.inputFileSystem),
								origResource,
								result.resource
							);
						}
					} else {
						for (const d of result.dependencies) {
							if (d.critical) d.critical = false;
						}
					}
				}
				return result;
			});
		});
	}
}

/**
 * @param {(fs: InputFileSystem, callback: (err: null | Error, map: NewContentCreateContextMap) => void) => void} createContextMap create context map function
 * @returns {(fs: InputFileSystem, options: ContextModuleOptions, callback: (err: null | Error, dependencies?: ContextElementDependency[]) => void) => void} resolve resolve dependencies from context map function
 */
const createResolveDependenciesFromContextMap =
	createContextMap => (fs, options, callback) => {
		createContextMap(fs, (err, map) => {
			if (err) return callback(err);
			const dependencies = Object.keys(map).map(
				key =>
					new ContextElementDependency(
						map[key] + options.resourceQuery + options.resourceFragment,
						key,
						options.typePrefix,
						/** @type {string} */
						(options.category),
						options.referencedExports
					)
			);
			callback(null, dependencies);
		});
	};

module.exports = ContextReplacementPlugin;
