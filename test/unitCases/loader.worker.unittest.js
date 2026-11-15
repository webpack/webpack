"use strict";

const path = require("path");
const { runLoaders } = require("../../lib/loaders/loader.worker");

const FIXTURE = path.resolve(__dirname, "../fixtures/loader-worker");
const RESOURCE = path.join(FIXTURE, "value.js");
const MAP_RESOURCE = path.join(FIXTURE, "with-map.js");

/** @typedef {import("../../lib/loaders/loader.worker").LoaderWorkerData} LoaderWorkerData */
/** @typedef {import("../../lib/loaders/loader.worker").LoaderContext} LoaderContext */

/**
 * @param {Partial<LoaderWorkerData>=} overrides data overrides
 * @returns {LoaderWorkerData} one job's data
 */
const createData = (overrides = {}) => ({
	resource: RESOURCE,
	resourcePath: RESOURCE,
	resourceQuery: "",
	resourceFragment: "",
	context: FIXTURE,
	loaders: [],
	sourceMap: false,
	extractSourceMap: false,
	useSourceMap: false,
	useSimpleSourceMap: false,
	validate: true,
	mode: "development",
	target: "web",
	minimize: false,
	rootContext: FIXTURE,
	hot: false,
	compiler: { options: { plugins: [] } },
	compilation: {
		outputOptions: {
			hashFunction: "md4",
			hashDigest: "hex",
			hashDigestLength: 8
		},
		options: { devtool: false },
		hash: "hash",
		fullHash: "hash",
		getPath: (filename) => String(filename)
	},
	...overrides
});

/**
 * @param {Record<string, (args: unknown[]) => unknown>=} handlers main-thread handlers
 * @returns {{ context: LoaderContext, calls: [string, unknown[]][] }} the RPC context and what it received
 */
const createContext = (handlers = {}) => {
	/** @type {[string, unknown[]][]} */
	const calls = [];
	return {
		context: {
			workerId: 7,
			callMain: async (method, args) => {
				calls.push([method, args]);
				const handler = handlers[method];
				if (handler === undefined) {
					throw new Error(`unexpected main call: ${method}`);
				}
				return handler(args);
			},
			callMainNoWait: (method, args) => {
				calls.push([method, args]);
			}
		},
		calls
	};
};

/**
 * @param {import("../../lib/module/NormalModule").LoaderResult} result the loader result
 * @returns {string} its first value as a string
 */
const firstValue = (result) => {
	if (result.result === undefined) throw new Error("no loader result");
	return String(result.result[0]);
};

/**
 * @param {[string, unknown[]][]} calls recorded calls
 * @param {string} method method name
 * @returns {unknown[] | undefined} the first call's arguments
 */
const firstCall = (calls, method) => {
	const call = calls.find(([name]) => name === method);
	return call === undefined ? undefined : call[1];
};

describe("loader.worker", () => {
	it("runs a loader chain and applies compiler.options.loader", async () => {
		const { context } = createContext();
		const result = await runLoaders(
			context,
			createData({
				loader: { customValue: 42 },
				loaders: [
					{ loader: path.join(FIXTURE, "options.js"), options: { value: 7 } }
				]
			})
		);

		const output = firstValue(result);
		expect(output).toContain('module.exports = "value";');
		expect(output).toContain(":7");
		expect(result.cacheable).toBe(true);
	});

	it("parses JSON and query-string loader options", async () => {
		const { context } = createContext();
		const json = await runLoaders(
			context,
			createData({
				loader: { customValue: 42 },
				loaders: [
					{
						loader: path.join(FIXTURE, "options.js"),
						options: JSON.stringify({ value: 9 })
					}
				]
			})
		);
		expect(firstValue(json)).toContain(":9");

		const query = await runLoaders(
			context,
			createData({
				loader: { customValue: 42 },
				validate: false,
				loaders: [
					{ loader: path.join(FIXTURE, "options.js"), options: "value=8" }
				]
			})
		);
		expect(firstValue(query)).toContain(":8");
	});

	it("forwards logger calls with child names", async () => {
		const { context, calls } = createContext();
		await runLoaders(
			context,
			createData({
				loaders: [{ loader: path.join(FIXTURE, "logger.js"), options: undefined }]
			})
		);

		expect(
			calls.filter(([method]) => method === "logger").map(([, args]) => args)
		).toEqual([
			["loader-thread-test", "info", ["worker info"], 0],
			["loader-thread-test/child", "warn", ["worker child"], 0],
			["loader-thread-test", "log", ["cached"], 0],
			["webpack", "info", ["default logger"], 0],
			["webpack/function-child", "warn", ["worker fn child"], 0]
		]);
		expect(
			calls.filter(([method]) => method === "getLogger").map(([, args]) => args[0])
		).toEqual([
			"loader-thread-test",
			"loader-thread-test/child",
			"webpack",
			"webpack/function-child"
		]);
	});

	it("forwards warnings and errors with the loader index", async () => {
		const { context, calls } = createContext();
		await runLoaders(
			context,
			createData({
				loaders: [{ loader: path.join(FIXTURE, "warn.js"), options: undefined }]
			})
		);

		const warning = firstCall(calls, "emitWarning");
		if (warning === undefined) throw new Error("no warning forwarded");
		expect(/** @type {{ message: string }} */ (warning[0]).message).toBe(
			"worker warning"
		);
		expect(warning[1]).toBe(0);

		const error = firstCall(calls, "emitError");
		if (error === undefined) throw new Error("no error forwarded");
		expect(/** @type {{ message: string }} */ (error[0]).message).toBe(
			"worker error"
		);
		expect(error[1]).toBe(0);
	});

	it("bridges resolve, getResolve, loadModule, importModule and exec", async () => {
		const { context } = createContext({
			resolve: () => RESOURCE,
			getResolve: () => RESOURCE,
			loadModule: () => [new Uint8Array(Buffer.from("loaded")), undefined],
			importModule: () => "imported"
		});
		const result = await runLoaders(
			context,
			createData({
				loaders: [{ loader: path.join(FIXTURE, "rpc.js"), options: undefined }]
			})
		);

		expect(firstValue(result)).toBe("true:true:loaded:imported:42");
	});

	it("rejects resolve, loadModule and importModule bridges", async () => {
		const { context } = createContext({
			resolve: () => {
				throw new Error("resolve failed");
			},
			importModule: (args) => {
				if (String(args[0]).includes("missing")) {
					throw new Error("import failed");
				}
				return "imported";
			},
			loadModule: () => {
				throw new Error("load failed");
			},
			getResolve: () => {
				throw new Error("resolve failed");
			}
		});
		const result = await runLoaders(
			context,
			createData({
				loaders: [
					{ loader: path.join(FIXTURE, "rpc-errors.js"), options: undefined }
				]
			})
		);

		expect(firstValue(result)).toBe("imported:resolve failed");
	});

	it("rejects when the initial resource cannot be read", async () => {
		const { context } = createContext();
		await expect(
			runLoaders(
				context,
				createData({
					resource: path.join(FIXTURE, "nope.js"),
					resourcePath: path.join(FIXTURE, "nope.js")
				})
			)
		).rejects.toThrow(/ENOENT/);
	});

	it("rejects with the worker prefix when a loader throws", async () => {
		const { context } = createContext();
		await expect(
			runLoaders(
				context,
				createData({
					loaders: [{ loader: path.join(FIXTURE, "fail.js"), options: undefined }]
				})
			)
		).rejects.toThrow(/Loader thread \(worker 7\): loader boom/);
	});

	it("strips the source map comment when source maps are off", async () => {
		const { context } = createContext();
		const result = await runLoaders(
			context,
			createData({
				resource: MAP_RESOURCE,
				resourcePath: MAP_RESOURCE,
				loader: { customValue: 42 },
				extractSourceMap: true,
				loaders: [
					{ loader: path.join(FIXTURE, "options.js"), options: { value: 1 } }
				]
			})
		);

		expect(firstValue(result)).not.toContain("sourceMappingURL");
	});

	it("provides the context utilities, hash and path helpers", async () => {
		const { context } = createContext({
			getResolve: () => RESOURCE,
			importModule: () => "value"
		});
		const result = await runLoaders(
			context,
			createData({
				loaders: [{ loader: path.join(FIXTURE, "context.js"), options: undefined }]
			})
		);

		expect(firstValue(result)).toBe("32:string:true:chunk:true:true:value:6:32:0");
		expect(result.buildDependencies).toContain(
			path.join(FIXTURE, "context.js")
		);
	});

	it("rejects options that are neither JSON nor a query string", async () => {
		const { context } = createContext();
		await expect(
			runLoaders(
				context,
				createData({
					loader: { customValue: 42 },
					loaders: [
						{ loader: path.join(FIXTURE, "options.js"), options: "{oops}" }
					]
				})
			)
		).rejects.toThrow(/Cannot parse string options/);
	});

	it("extracts a source map read through the RPC bridge", async () => {
		const sourceMap = JSON.stringify({
			version: 3,
			sources: ["value.js"],
			names: [],
			mappings: "AAAA",
			sourcesContent: ['module.exports = "value";']
		});
		const { context } = createContext({
			readResource: () => new Uint8Array(Buffer.from(sourceMap))
		});
		const result = await runLoaders(
			context,
			createData({
				resource: MAP_RESOURCE,
				resourcePath: MAP_RESOURCE,
				extractSourceMap: true,
				useSourceMap: true
			})
		);

		if (result.result === undefined) throw new Error("no loader result");
		const map = /** @type {{ version?: number }} */ (result.result[1]);
		expect(map.version).toBe(3);

		const { context: stringBridge } = createContext({
			readResource: () => sourceMap
		});
		const stringResult = await runLoaders(
			stringBridge,
			createData({
				resource: MAP_RESOURCE,
				resourcePath: MAP_RESOURCE,
				extractSourceMap: true,
				useSourceMap: true
			})
		);
		if (stringResult.result === undefined) throw new Error("no loader result");
		const stringMap = /** @type {{ version?: number }} */ (
			stringResult.result[1]
		);
		expect(stringMap.version).toBe(3);
	});

	it("warns with the main-thread prefix when a source map cannot be read", async () => {
		const { context, calls } = createContext({
			readResource: () => {
				throw new Error("missing.map not found");
			}
		});
		const result = await runLoaders(
			context,
			createData({
				resource: MAP_RESOURCE,
				resourcePath: MAP_RESOURCE,
				loader: { customValue: 42 },
				extractSourceMap: true,
				useSourceMap: true,
				loaders: [
					{ loader: path.join(FIXTURE, "options.js"), options: { value: 1 } }
				]
			})
		);

		const warning = firstCall(calls, "emitWarning");
		if (warning === undefined) throw new Error("no warning forwarded");
		expect(/** @type {{ message: string }} */ (warning[0]).message).toMatch(
			/^Failed to parse source map\./
		);
		// no loader owns this warning; the main thread adds it module-level
		expect(warning.length).toBe(1);
		expect(firstValue(result)).toContain("sourceMappingURL");
	});
});
