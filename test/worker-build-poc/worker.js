"use strict";

const { parentPort } = require("worker_threads");

// Ensure all serializable types are registered
require("../../lib/util/internalSerializables");
require("../../lib/util/registerExternalSerializer");

const NormalModule = require("../../lib/NormalModule");
const { RawSource } = require("webpack-sources");
const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const BinaryMiddleware = require("../../lib/serialization/BinaryMiddleware");

/** @type {import("../../lib/javascript/JavascriptParser") | undefined} */
let JavascriptParser;
/** @type {InstanceType<typeof import("../../lib/javascript/JavascriptParser")> | undefined} */
let parser;

parentPort.on("message", (msg) => {
	if (msg.type === "init") {
		// Create a parser with standard ESM plugin hooks
		JavascriptParser = require("../../lib/javascript/JavascriptParser");
		const { JAVASCRIPT_MODULE_TYPE_AUTO } = require("../../lib/ModuleTypeConstants");

		parser = new JavascriptParser("module");

		// Register standard dependency parser plugins
		const HarmonyImportDependencyParserPlugin = require("../../lib/dependencies/HarmonyImportDependencyParserPlugin");
		const HarmonyExportDependencyParserPlugin = require("../../lib/dependencies/HarmonyExportDependencyParserPlugin");
		const HarmonyTopLevelThisParserPlugin = require("../../lib/dependencies/HarmonyTopLevelThisParserPlugin");
		const HarmonyDetectionParserPlugin = require("../../lib/dependencies/HarmonyDetectionParserPlugin");

		new HarmonyDetectionParserPlugin(msg.config || {}).apply(parser);
		new HarmonyImportDependencyParserPlugin(msg.config || {}).apply(parser);
		new HarmonyExportDependencyParserPlugin(msg.config || {}).apply(parser);
		new HarmonyTopLevelThisParserPlugin().apply(parser);

		parentPort.postMessage({ type: "ready" });
		return;
	}

	if (msg.type === "build") {
		try {
			const result = buildAndSerialize(msg);
			// Copy into a fresh ArrayBuffer so it can be transferred
			const ab = new ArrayBuffer(result.buffer.length);
			new Uint8Array(ab).set(result.buffer);
			parentPort.postMessage(
				{ type: "result", id: msg.id, buffer: Buffer.from(ab), depsCount: result.depsCount },
				[ab]
			);
		} catch (err) {
			parentPort.postMessage({
				type: "error",
				id: msg.id,
				error: err.message + "\n" + err.stack
			});
		}
	}
});

/**
 * Build a module from source and serialize it.
 * @param {{ id: number, source: string, resource: string, request: string }} msg
 * @returns {{ buffer: Buffer, depsCount: number }}
 */
function buildAndSerialize(msg) {
	const { source, resource, request } = msg;

	// Create a NormalModule-like object with build results
	const mod = new NormalModule({
		type: "javascript/auto",
		request,
		userRequest: request,
		rawRequest: request,
		resource,
		loaders: [],
		matchResource: undefined,
		parser,
		generator: undefined,
		resolveOptions: undefined,
		context: require("path").dirname(resource)
	});

	// Simulate _doBuild: set source
	mod._source = new RawSource(source);
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

	// Parse (this is the CPU-intensive work we want to parallelize)
	parser.parse(source, {
		source,
		current: mod,
		module: mod,
		compilation: undefined,
		options: { context: require("path").dirname(resource) }
	});

	// Build hash
	const createHash = require("../../lib/util/createHash");
	const hash = createHash("md4");
	hash.update("source");
	mod._source.updateHash(hash);
	hash.update("meta");
	hash.update(JSON.stringify(mod.buildMeta));
	mod.buildInfo.hash = hash.digest("hex");

	// Serialize: ObjectMiddleware (obj→tokens) then BinaryMiddleware (tokens→buffers)
	// We call them directly without lazy wrapping to get a flat buffer.
	const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
	const BinaryMiddleware = require("../../lib/serialization/BinaryMiddleware");

	const objMiddleware = new ObjectMiddleware(() => {}, "md4");
	const binMiddleware = new BinaryMiddleware();

	// ObjectMiddleware.serialize expects an array of items
	const tokens = objMiddleware.serialize([mod], {});
	// BinaryMiddleware.serialize returns Buffer[]
	const serialized = binMiddleware.serialize(tokens, {});

	// Collect only actual Buffers (skip any lazy markers)
	const parts = [];
	for (const item of serialized) {
		if (Buffer.isBuffer(item)) parts.push(item);
	}
	const buffer = Buffer.concat(parts);

	return { buffer, depsCount: mod.dependencies.length };
}
