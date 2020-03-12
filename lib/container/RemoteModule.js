/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Module = require("../Module");
const RuntimeGlobals = require("../RuntimeGlobals");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");

/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

const TYPES = new Set(["remote"]);
const RUNTIME_REQUIREMENTS = new Set([RuntimeGlobals.module]);

class RemoteModule extends Module {
	constructor(request, externalRequest, internalRequest) {
		super("remote-module");
		this.request = request;
		this.externalRequest = externalRequest;
		this.internalRequest = internalRequest;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `remote ${this.externalRequest} ${this.internalRequest}`;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `remote ${this.request}`;
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
	 * @returns {Set<string>} types availiable (do not mutate)
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
}

module.exports = RemoteModule;
