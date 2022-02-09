/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const { rangeToString, stringifyHoley } = require("../util/semver");
const ConsumeSharedFallbackDependency = require("./ConsumeSharedFallbackDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../util/semver").SemVerRange} SemVerRange */

/**
 * @typedef {Object} ConsumeOptions
 * @property {string=} import fallback request
 * @property {string=} importResolved resolved fallback request
 * @property {string} shareKey global share key
 * @property {string} shareScope share scope
 * @property {SemVerRange | false | undefined} requiredVersion version requirement
 * @property {string} packageName package name to determine required version automatically
 * @property {boolean} strictVersion don't use shared version even if version isn't valid
 * @property {boolean} singleton use single global version
 * @property {boolean} eager include the fallback module in a sync way
 */

const TYPES = new Set(["consume-shared"]);

class ConsumeSharedModule extends Module {
	/**
	 * @param {string} context context
	 * @param {ConsumeOptions} options consume options
	 */
	constructor(context, options) {
		super("consume-shared-module", context);
		this.options = options;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		const {
			shareKey,
			shareScope,
			importResolved,
			requiredVersion,
			strictVersion,
			singleton,
			eager
		} = this.options;
		return `consume-shared-module|${shareScope}|${shareKey}|${
			requiredVersion && rangeToString(requiredVersion)
		}|${strictVersion}|${importResolved}|${singleton}|${eager}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		const {
			shareKey,
			shareScope,
			importResolved,
			requiredVersion,
			strictVersion,
			singleton,
			eager
		} = this.options;
		return `consume shared module (${shareScope}) ${shareKey}@${
			requiredVersion ? rangeToString(requiredVersion) : "*"
		}${strictVersion ? " (strict)" : ""}${singleton ? " (singleton)" : ""}${
			importResolved
				? ` (fallback: ${requestShortener.shorten(importResolved)})`
				: ""
		}${eager ? " (eager)" : ""}`;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		const { shareKey, shareScope, import: request } = this.options;
		return `${
			this.layer ? `(${this.layer})/` : ""
		}webpack/sharing/consume/${shareScope}/${shareKey}${
			request ? `/${request}` : ""
		}`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function((WebpackError | null)=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		callback(null, !this.buildInfo);
	}

	/**
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.buildMeta = {};
		this.buildInfo = {};
		if (this.options.import) {
			const dep = new ConsumeSharedFallbackDependency(this.options.import);
			if (this.options.eager) {
				this.addDependency(dep);
			} else {
				const block = new AsyncDependenciesBlock({});
				block.addDependency(dep);
				this.addBlock(block);
			}
		}
		callback();
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(JSON.stringify(this.options));
		super.updateHash(hash, context);
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ chunkGraph, moduleGraph, runtimeTemplate }) {
		const runtimeRequirements = new Set([RuntimeGlobals.shareScopeMap]);
		const {
			shareScope,
			shareKey,
			strictVersion,
			requiredVersion,
			import: request,
			singleton,
			eager
		} = this.options;
		let fallbackCode;
		if (request) {
			if (eager) {
				const dep = this.dependencies[0];
				fallbackCode = runtimeTemplate.syncModuleFactory({
					dependency: dep,
					chunkGraph,
					runtimeRequirements,
					request: this.options.import
				});
			} else {
				const block = this.blocks[0];
				fallbackCode = runtimeTemplate.asyncModuleFactory({
					block,
					chunkGraph,
					runtimeRequirements,
					request: this.options.import
				});
			}
		}
		let fn = "load";
		const args = [JSON.stringify(shareScope), JSON.stringify(shareKey)];
		if (requiredVersion) {
			if (strictVersion) {
				fn += "Strict";
			}
			if (singleton) {
				fn += "Singleton";
			}
			args.push(stringifyHoley(requiredVersion));
			fn += "VersionCheck";
		} else {
			if (singleton) {
				fn += "Singleton";
			}
		}
		if (fallbackCode) {
			fn += "Fallback";
			args.push(fallbackCode);
		}
		const code = runtimeTemplate.returningFunction(`${fn}(${args.join(", ")})`);
		const sources = new Map();
		sources.set("consume-shared", new RawSource(code));
		return {
			runtimeRequirements,
			sources
		};
	}

	serialize(context) {
		const { write } = context;
		write(this.options);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.options = read();
		super.deserialize(context);
	}
}

makeSerializable(
	ConsumeSharedModule,
	"webpack/lib/sharing/ConsumeSharedModule"
);

module.exports = ConsumeSharedModule;
