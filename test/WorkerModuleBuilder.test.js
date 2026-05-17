"use strict";

const path = require("path");
const fs = require("fs");
const WorkerModuleBuilder = require("../lib/build/WorkerModuleBuilder");
const JavascriptParser = require("../lib/javascript/JavascriptParser");
const NormalModule = require("../lib/NormalModule");
const { RawSource } = require("webpack-sources");

// Ensure serializable types are registered
require("../lib/util/internalSerializables");
require("../lib/util/registerExternalSerializer");

const TEST_DIR = path.resolve(__dirname, ".worker-test-modules");

/**
 * Build a module on the main thread for comparison.
 * @param {string} source source code
 * @param {string} resource file path
 * @returns {{ deps: number, depTypes: string[], presentational: number }}
 */
function buildOnMainThread(source, resource) {
	const parser = new JavascriptParser("module");
	const HDP = require("../lib/dependencies/HarmonyDetectionParserPlugin");
	const HarmonyImportPlugin = require("../lib/dependencies/HarmonyImportDependencyParserPlugin");
	const HarmonyExportPlugin = require("../lib/dependencies/HarmonyExportDependencyParserPlugin");
	const HarmonyThisPlugin = require("../lib/dependencies/HarmonyTopLevelThisParserPlugin");
	new HDP({}).apply(parser);
	new HarmonyImportPlugin({}).apply(parser);
	new HarmonyExportPlugin({}).apply(parser);
	new HarmonyThisPlugin().apply(parser);

	const mod = new NormalModule({
		type: "javascript/auto",
		request: resource,
		userRequest: resource,
		rawRequest: resource,
		resource,
		loaders: [],
		parser,
		context: path.dirname(resource)
	});
	mod._source = new RawSource(source);
	mod.buildInfo = {
		cacheable: true,
		parsed: true,
		fileDependencies: new Set([resource]),
		contextDependencies: new Set(),
		missingDependencies: new Set()
	};
	mod.buildMeta = {};
	parser.parse(source, {
		source,
		current: mod,
		module: mod,
		compilation: undefined,
		options: { context: path.dirname(resource) }
	});

	return {
		deps: mod.dependencies.length,
		depTypes: mod.dependencies.map((d) => d.constructor.name).sort(),
		presentational: (mod.presentationalDependencies || []).length
	};
}

beforeAll(() => {
	fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
	fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("WorkerModuleBuilder", () => {
	/** @type {WorkerModuleBuilder} */
	let builder;

	beforeAll(async () => {
		builder = new WorkerModuleBuilder({ workers: 2 });
		await builder.initialize();
	});

	afterAll(async () => {
		await builder.terminate();
	});

	it("should build a simple export module", async () => {
		const source = "export const x = 1;\nexport default 42;\n";
		const resource = path.join(TEST_DIR, "simple.js");
		fs.writeFileSync(resource, source);

		const mod = await builder.build(source, resource, resource);

		expect(mod).toBeDefined();
		expect(mod.type).toBe("javascript/auto");
		expect(mod.resource).toBe(resource);
		expect(mod.dependencies.length).toBeGreaterThan(0);

		const expected = buildOnMainThread(source, resource);
		expect(mod.dependencies.length).toBe(expected.deps);
	});

	it("should build a module with imports", async () => {
		const source =
			'import { foo } from "./foo.js";\nimport bar from "./bar.js";\nexport default foo + bar;\n';
		const resource = path.join(TEST_DIR, "imports.js");
		fs.writeFileSync(resource, source);

		const mod = await builder.build(source, resource, resource);
		const expected = buildOnMainThread(source, resource);

		expect(mod.dependencies.length).toBe(expected.deps);
		expect(
			mod.dependencies.map((d) => d.constructor.name).sort()
		).toEqual(expected.depTypes);
		expect(
			(mod.presentationalDependencies || []).length
		).toBe(expected.presentational);
	});

	it("should build a module with re-exports", async () => {
		const source =
			'export { x } from "./dep.js";\nexport * from "./other.js";\n';
		const resource = path.join(TEST_DIR, "reexport.js");
		fs.writeFileSync(resource, source);

		const mod = await builder.build(source, resource, resource);
		const expected = buildOnMainThread(source, resource);

		expect(mod.dependencies.length).toBe(expected.deps);
	});

	it("should handle multiple concurrent builds", async () => {
		const sources = [];
		for (let i = 0; i < 20; i++) {
			const source = `export const v${i} = ${i};\nexport default v${i};\n`;
			const resource = path.join(TEST_DIR, `concurrent_${i}.js`);
			fs.writeFileSync(resource, source);
			sources.push({ source, resource });
		}

		const results = await Promise.all(
			sources.map((s) => builder.build(s.source, s.resource, s.resource))
		);

		expect(results.length).toBe(20);
		for (let i = 0; i < 20; i++) {
			expect(results[i].dependencies.length).toBeGreaterThan(0);
			expect(results[i].resource).toBe(sources[i].resource);
		}
	});

	it("should produce buildInfo with hash", async () => {
		const source = "export default 'hello';\n";
		const resource = path.join(TEST_DIR, "hash.js");
		fs.writeFileSync(resource, source);

		const mod = await builder.build(source, resource, resource);

		expect(mod.buildInfo).toBeDefined();
		expect(mod.buildInfo.hash).toBeDefined();
		expect(typeof mod.buildInfo.hash).toBe("string");
		expect(mod.buildInfo.hash.length).toBeGreaterThan(0);
	});
});
