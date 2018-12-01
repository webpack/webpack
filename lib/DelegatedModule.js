/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const Module = require("./Module");
const RuntimeGlobals = require("./RuntimeGlobals");
const DelegatedExportsDependency = require("./dependencies/DelegatedExportsDependency");
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./dependencies/ModuleDependency")} ModuleDependency */
/** @typedef {import("./util/createHash").Hash} Hash */

class DelegatedModule extends Module {
	constructor(sourceRequest, data, type, userRequest, originalRequest) {
		super("javascript/dynamic", null);

		// Info from Factory
		this.sourceRequest = sourceRequest;
		this.request = data.id;
		this.delegationType = type;
		this.userRequest = userRequest;
		this.originalRequest = originalRequest;
		this.delegateData = data;

		// Build info
		this.delegatedSourceDependency = undefined;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return typeof this.originalRequest === "string"
			? this.originalRequest
			: this.originalRequest.libIdent(options);
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `delegated ${JSON.stringify(this.request)} from ${
			this.sourceRequest
		}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `delegated ${this.userRequest} from ${this.sourceRequest}`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		return callback(null, !this.buildMeta);
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.buildMeta = Object.assign({}, this.delegateData.buildMeta);
		this.buildInfo = {};
		this.dependencies.length = 0;
		this.delegatedSourceDependency = new DelegatedSourceDependency(
			this.sourceRequest
		);
		this.addDependency(this.delegatedSourceDependency);
		this.addDependency(
			new DelegatedExportsDependency(this.delegateData.exports || true)
		);
		callback();
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source({ runtimeTemplate, moduleGraph, chunkGraph }) {
		const dep = /** @type {DelegatedSourceDependency} */ (this.dependencies[0]);
		const sourceModule = moduleGraph.getModule(dep);
		let str;

		if (!sourceModule) {
			str = runtimeTemplate.throwMissingModuleErrorBlock({
				request: this.sourceRequest
			});
		} else {
			str = `module.exports = (${runtimeTemplate.moduleExports({
				module: sourceModule,
				chunkGraph,
				request: dep.request,
				runtimeRequirements: new Set()
			})})`;

			switch (this.delegationType) {
				case "require":
					str += `(${JSON.stringify(this.request)})`;
					break;
				case "object":
					str += `[${JSON.stringify(this.request)}]`;
					break;
			}

			str += ";";
		}

		if (this.useSourceMap) {
			return new OriginalSource(str, this.identifier());
		} else {
			return new RawSource(str);
		}
	}

	/**
	 * Get a list of runtime requirements
	 * @param {SourceContext} context context for code generation
	 * @returns {Iterable<string> | null} required runtime modules
	 */
	getRuntimeRequirements(context) {
		return [RuntimeGlobals.module, RuntimeGlobals.require];
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return 42;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this.delegationType);
		hash.update(JSON.stringify(this.request));
		super.updateHash(hash, chunkGraph);
	}
}

module.exports = DelegatedModule;
