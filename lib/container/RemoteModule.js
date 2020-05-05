/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const createHash = require("../util/createHash");
const makeSerializable = require("../util/makeSerializable");
const RemoteOverridesDependency = require("./RemoteOverridesDependency");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

const TYPES = new Set(["remote"]);
const RUNTIME_REQUIREMENTS = new Set([RuntimeGlobals.module]);

class RemoteModule extends Module {
	constructor(request, overrides, externalRequest, internalRequest) {
		super("remote-module");
		this.request = request;
		this.overrides = overrides;
		this.externalRequest = externalRequest;
		this.internalRequest = internalRequest;
		const hash = createHash("md4");
		for (const [key, request] of overrides) {
			hash.update(key);
			hash.update(request);
		}
		this._overridesHash = hash.digest("hex");
		this._identifier = `remote ${this.externalRequest} ${this.internalRequest} ${this._overridesHash}`;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this._identifier;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `remote ${this.request}`;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `webpack/container/remote/${this.request}`;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
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
		this.buildInfo = {
			strict: true
		};

		this.clearDependenciesAndBlocks();
		this.addDependency(new RemoteToExternalDependency(this.externalRequest));
		this.addDependency(new RemoteOverridesDependency(this.overrides));

		callback();
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 42;
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return TYPES;
	}

	/**
	 * @returns {string | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		return this.request;
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ runtimeTemplate, moduleGraph, chunkGraph }) {
		const sources = new Map();
		sources.set("remote", new RawSource(""));
		return { sources, runtimeRequirements: RUNTIME_REQUIREMENTS };
	}

	serialize(context) {
		const { write } = context;
		write(this.request);
		write(this.overrides);
		write(this.externalRequest);
		write(this.internalRequest);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.request = read();
		this.overrides = read();
		this.externalRequest = read();
		this.internalRequest = read();
		super.deserialize(context);
	}
}

makeSerializable(RemoteModule, "webpack/lib/container/RemoteModule");

module.exports = RemoteModule;
