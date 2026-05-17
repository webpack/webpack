/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const fs = require("fs");
const path = require("path");
// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { parentPort } = require("worker_threads");
const { OriginalSource } = require("webpack-sources");
const NormalModule = require("../NormalModule");
const JavascriptParser = require("../javascript/JavascriptParser");
const createHash = require("../util/createHash");

/** @type {InstanceType<typeof JavascriptParser> | undefined} */
let parser;

/**
 * @param {EXPECTED_OBJECT} config parser options
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
 * @returns {EXPECTED_OBJECT} plain descriptor
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
 * @returns {EXPECTED_OBJECT} build result with plain dependency descriptors
 */
function buildModule(resource, request) {
	const source = fs.readFileSync(resource, "utf8");
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
		presentationalDeps: (mod.presentationalDependencies || []).map(describeDep),
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

/** @type {boolean} */
let initialized = false;

/** @type {NonNullable<typeof parentPort>} */
(parentPort).on("message", (msg) => {
	const { type, id, data } = msg;
	switch (type) {
		case "warmup":
			if (!initialized) {
				setup((data && data.config) || {});
				initialized = true;
			}
			break;

		case "job":
			if (!initialized) {
				setup((data && data.config) || {});
				initialized = true;
			}
			try {
				const result = buildModule(data.resource, data.request);
				/** @type {NonNullable<typeof parentPort>} */
				(parentPort).postMessage({
					type: "result",
					id,
					data: result
				});
			} catch (err) {
				/** @type {NonNullable<typeof parentPort>} */
				(parentPort).postMessage({
					type: "error",
					id,
					error: /** @type {Error} */ (err).message
				});
			}
			break;
	}
});
