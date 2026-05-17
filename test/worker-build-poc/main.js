"use strict";

/**
 * POC: Build modules in worker threads, serialize → transfer → deserialize.
 *
 * Demonstrates the full roundtrip:
 * 1. Read source files
 * 2. Send to worker → parse + walk + create dependencies + serialize
 * 3. Worker returns Buffer (zero-copy transfer)
 * 4. Main thread deserializes → gets complete NormalModule with dependencies
 * 5. Verify correctness by comparing with main-thread build
 *
 * Usage: node test/worker-build-poc/main.js
 */

const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs");

// Ensure all serializable types are registered
require("../../lib/util/internalSerializables");

const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const BinaryMiddleware = require("../../lib/serialization/BinaryMiddleware");
const JavascriptParser = require("../../lib/javascript/JavascriptParser");
const NormalModule = require("../../lib/NormalModule");
const { RawSource } = require("webpack-sources");
const { JAVASCRIPT_MODULE_TYPE_AUTO } = require("../../lib/ModuleTypeConstants");

// Prepare test source files
const TEST_DIR = path.resolve(__dirname, "test-modules");
fs.rmSync(TEST_DIR, { recursive: true, force: true });
fs.mkdirSync(TEST_DIR, { recursive: true });

// Create test modules
const modules = [
	{
		name: "dep.js",
		source: `export const x = 1;\nexport function hello() { return 'hello'; }\nexport default 42;\n`
	},
	{
		name: "index.js",
		source: `import def, { x, hello } from "./dep.js";\nexport const result = def + x + hello();\nexport default result;\n`
	},
	{
		name: "utils.js",
		source: `const PI = 3.14159;\nfunction area(r) { return PI * r * r; }\nexport { PI, area };\nexport default area;\n`
	}
];

for (const m of modules) {
	fs.writeFileSync(path.join(TEST_DIR, m.name), m.source);
}

async function main() {
	console.log("=== Worker Module Build POC ===\n");

	// Step 1: Build on main thread (baseline for comparison)
	console.log("Step 1: Main thread build (baseline)");
	const mainResults = {};
	const parser = new JavascriptParser("module");

	// Register plugins
	const HarmonyDetectionParserPlugin = require("../../lib/dependencies/HarmonyDetectionParserPlugin");
	const HarmonyImportDependencyParserPlugin = require("../../lib/dependencies/HarmonyImportDependencyParserPlugin");
	const HarmonyExportDependencyParserPlugin = require("../../lib/dependencies/HarmonyExportDependencyParserPlugin");
	const HarmonyTopLevelThisParserPlugin = require("../../lib/dependencies/HarmonyTopLevelThisParserPlugin");

	new HarmonyDetectionParserPlugin({}).apply(parser);
	new HarmonyImportDependencyParserPlugin({}).apply(parser);
	new HarmonyExportDependencyParserPlugin({}).apply(parser);
	new HarmonyTopLevelThisParserPlugin().apply(parser);

	for (const m of modules) {
		const resource = path.join(TEST_DIR, m.name);
		const mod = new NormalModule({
			type: "javascript/auto",
			request: resource,
			userRequest: resource,
			rawRequest: "./" + m.name,
			resource,
			loaders: [],
			matchResource: undefined,
			parser,
			generator: undefined,
			resolveOptions: undefined,
			context: TEST_DIR
		});
		mod._source = new RawSource(m.source);
		mod.buildInfo = {
			cacheable: true, parsed: true,
			fileDependencies: new Set([resource]),
			contextDependencies: new Set(),
			missingDependencies: new Set(),
			hash: undefined, assets: undefined, assetsInfo: undefined,
			buildDependencies: undefined, valueDependencies: undefined
		};
		mod.buildMeta = {};

		parser.parse(m.source, {
			source: m.source,
			current: mod,
			module: mod,
			compilation: undefined,
			options: { context: TEST_DIR }
		});

		mainResults[m.name] = {
			depsCount: mod.dependencies.length,
			depTypes: mod.dependencies.map(d => d.constructor.name),
			blocksCount: mod.blocks.length,
			presentationalDeps: (mod.presentationalDependencies || []).length
		};
		console.log(`  ${m.name}: ${mod.dependencies.length} deps, ${(mod.presentationalDependencies || []).length} presentational`);
	}

	// Step 2: Build in worker → serialize → transfer → deserialize
	console.log("\nStep 2: Worker build → serialize → transfer → deserialize");

	const worker = new Worker(path.join(__dirname, "worker.js"));

	// Initialize worker
	await new Promise((resolve, reject) => {
		worker.once("message", (msg) => {
			if (msg.type === "ready") resolve();
			else reject(new Error("Worker init failed"));
		});
		worker.postMessage({ type: "init", config: {} });
	});

	const workerResults = {};
	let totalSerializedBytes = 0;

	for (let i = 0; i < modules.length; i++) {
		const m = modules[i];
		const resource = path.join(TEST_DIR, m.name);

		const result = await new Promise((resolve, reject) => {
			worker.once("message", (msg) => {
				if (msg.type === "result") resolve(msg);
				else reject(new Error(msg.error));
			});
			worker.postMessage({
				type: "build",
				id: i,
				source: m.source,
				resource,
				request: resource
			});
		});

		const buffer = result.buffer;
		totalSerializedBytes += buffer.length;

		// Deserialize on main thread: BinaryMiddleware (buffer→tokens) then ObjectMiddleware (tokens→obj)
		const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
		const BinaryMiddleware = require("../../lib/serialization/BinaryMiddleware");

		const binMiddleware = new BinaryMiddleware();
		const objMiddleware = new ObjectMiddleware(() => {}, "md4");

		const tokens = binMiddleware.deserialize([Buffer.from(buffer)], {});
		const [deserializedModule] = objMiddleware.deserialize(tokens, {});

		workerResults[m.name] = {
			bufferSize: buffer.length,
			depsCount: deserializedModule.dependencies.length,
			depTypes: deserializedModule.dependencies.map(d => d.constructor.name),
			blocksCount: deserializedModule.blocks.length,
			presentationalDeps: (deserializedModule.presentationalDependencies || []).length,
			request: deserializedModule.request,
			type: deserializedModule.type
		};

		console.log(`  ${m.name}: ${buffer.length} bytes → ${deserializedModule.dependencies.length} deps (${deserializedModule.type})`);
	}

	// Step 3: Verify correctness
	console.log("\nStep 3: Correctness verification");
	let allMatch = true;

	for (const m of modules) {
		const main = mainResults[m.name];
		const work = workerResults[m.name];
		const depsMatch = main.depsCount === work.depsCount;
		const typesMatch = JSON.stringify(main.depTypes) === JSON.stringify(work.depTypes);
		const presMatch = main.presentationalDeps === work.presentationalDeps;
		const ok = depsMatch && typesMatch && presMatch;
		allMatch = allMatch && ok;
		console.log(`  ${m.name}: ${ok ? "✓ MATCH" : "✗ MISMATCH"}`);
		if (!ok) {
			console.log(`    deps: ${main.depsCount} vs ${work.depsCount}`);
			console.log(`    types: ${main.depTypes.join(",")} vs ${work.depTypes.join(",")}`);
			console.log(`    presentational: ${main.presentationalDeps} vs ${work.presentationalDeps}`);
		}
	}

	// Summary
	console.log("\n=== Summary ===");
	console.log(`Modules tested: ${modules.length}`);
	console.log(`Total serialized: ${totalSerializedBytes} bytes (avg ${Math.round(totalSerializedBytes / modules.length)} bytes/module)`);
	console.log(`Correctness: ${allMatch ? "ALL MATCH ✓" : "MISMATCH ✗"}`);

	worker.terminate();
	fs.rmSync(TEST_DIR, { recursive: true, force: true });

	if (!allMatch) process.exit(1);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
