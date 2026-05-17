/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { parentPort } = require("worker_threads");
const path = require("path");
const fs = require("fs");

const JavascriptParser = require("../javascript/JavascriptParser");
const NormalModule = require("../NormalModule");
const { OriginalSource } = require("webpack-sources");
const createHash = require("../util/createHash");

/** @type {InstanceType<typeof JavascriptParser> | undefined} */
let parser;

/**
 * @param {object} config parser options
 */
function setup(config) {
	parser = new JavascriptParser("module");

	const HarmonyDetectionParserPlugin = require("../dependencies/HarmonyDetectionParserPlugin");
	const HarmonyImportDependencyParserPlugin = require("../dependencies/HarmonyImportDependencyParserPlugin");
	const HarmonyExportDependencyParserPlugin = require("../dependencies/HarmonyExportDependencyParserPlugin");
	const HarmonyTopLevelThisParserPlugin = require("../dependencies/HarmonyTopLevelThisParserPlugin");

	new HarmonyDetectionParserPlugin(config).apply(parser);
	new HarmonyImportDependencyParserPlugin(config).apply(parser);
	new HarmonyExportDependencyParserPlugin(config).apply(parser);
	new HarmonyTopLevelThisParserPlugin().apply(parser);
}

/**
 * @param {import("../Dependency")} dep dependency
 * @returns {object} plain descriptor
 */
function describeDep(dep) {
	const desc = { _type: dep.constructor.name };
	for (const key of Object.keys(dep)) {
		if (key.startsWith("_")) continue;
		const val = dep[key];
		if (typeof val === "function") continue;
		desc[key] = val;
	}
	return desc;
}

/**
 * Read file, parse, extract dependencies as plain objects.
 * @param {string} resource absolute file path
 * @param {string} request full request string
 * @returns {object} build result with plain dependency descriptors
 */
function buildModule(resource, request) {
	const source = fs.readFileSync(resource, "utf-8");
	const context = path.dirname(resource);

	const mod = new NormalModule({
		type: "javascript/auto",
		request,
		userRequest: request,
		rawRequest: request,
		resource,
		loaders: [],
		matchResource: undefined,
		parser: /** @type {InstanceType<typeof JavascriptParser>} */ (parser),
		generator: undefined,
		resolveOptions: undefined,
		context
	});

	mod._source = new OriginalSource(source, resource);
	mod.buildInfo = {
		cacheable: true,
		parsed: true,
		fileDependencies: new Set([resource]),
		contextDependencies: new Set(),
		missingDependencies: new Set(),
		buildDependencies: undefined,
		valueDependencies: undefined,
		hash: undefined,
		assets: undefined,
		assetsInfo: undefined
	};
	mod.buildMeta = {};

	/** @type {InstanceType<typeof JavascriptParser>} */
	(parser).parse(source, {
		source,
		current: mod,
		module: mod,
		compilation: undefined,
		options: { context }
	});

	const hash = createHash("md4");
	hash.update("source");
	mod._source.updateHash(hash);
	hash.update("meta");
	hash.update(JSON.stringify(mod.buildMeta));
	const buildHash = hash.digest("hex");

	return {
		source,
		deps: mod.dependencies.map(describeDep),
		presentationalDeps: (mod.presentationalDependencies || []).map(
			describeDep
		),
		blocks: mod.blocks.map((b) => ({
			dependencies: b.dependencies.map(describeDep),
			blocks: []
		})),
		buildMeta: mod.buildMeta,
		buildHash,
		resource,
		request,
		context
	};
}

/** @type {NonNullable<typeof parentPort>} */
(parentPort).on("message", (msg) => {
	switch (msg.type) {
		case "init":
			setup(msg.config || {});
			/** @type {NonNullable<typeof parentPort>} */
			(parentPort).postMessage({ type: "ready" });
			break;

		case "build":
			try {
				const result = buildModule(msg.resource, msg.request);
				/** @type {NonNullable<typeof parentPort>} */
				(parentPort).postMessage({
					type: "result",
					id: msg.id,
					result
				});
			} catch (err) {
				/** @type {NonNullable<typeof parentPort>} */
				(parentPort).postMessage({
					type: "error",
					id: msg.id,
					error: /** @type {Error} */ (err).message
				});
			}
			break;
	}
});
