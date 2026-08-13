"use strict";

const RequestShortener = require("../lib/RequestShortener");
const RuntimeTemplate = require("../lib/RuntimeTemplate");

/** @typedef {import("../lib/config/defaults").OutputNormalizedWithDefaults} OutputOptions */

describe("RuntimeTemplate.concatenation", () => {
	it("no args", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: false } })
			),
			new RequestShortener(__dirname)
		);
		expect(runtimeTemplate.concatenation()).toBe('""');
	});

	it("1 arg", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: false } })
			),
			new RequestShortener(__dirname)
		);
		expect(
			runtimeTemplate.concatenation({
				expr: /** @type {string} */ (/** @type {unknown} */ (1))
			})
		).toBe('"" + 1');
		expect(runtimeTemplate.concatenation("str")).toBe('"str"');
	});

	it("es5", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: false } })
			),
			new RequestShortener(__dirname)
		);

		expect(
			runtimeTemplate.concatenation({ expr: "__webpack__.p" }, "str/a")
		).toBe('__webpack__.p + "str/a"');
		expect(
			runtimeTemplate.concatenation(
				{ expr: "__webpack__.p" },
				{ expr: "str.a" },
				"str"
			)
		).toBe('"" + __webpack__.p + str.a + "str"');
		expect(
			runtimeTemplate.concatenation("a", "b", {
				expr: /** @type {string} */ (/** @type {unknown} */ (1))
			})
		).toBe('"a" + "b" + 1');
		expect(
			runtimeTemplate.concatenation(
				"a",
				{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
				"b"
			)
		).toBe('"a" + 1 + "b"');
	});

	describe("es6", () => {
		const runtimeTemplate = new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { templateLiteral: true } })
			),
			new RequestShortener(__dirname)
		);

		it("should prefer shorten variant #1", () => {
			expect(
				runtimeTemplate.concatenation(
					{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
					"a",
					{ expr: /** @type {string} */ (/** @type {unknown} */ (2)) }
				)
			).toBe('1 + "a" + 2');
		});

		it("should prefer shorten variant #2", () => {
			expect(
				runtimeTemplate.concatenation(
					{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
					"a",
					{ expr: /** @type {string} */ (/** @type {unknown} */ (2)) },
					"b"
				)
			).toBe('1 + "a" + 2 + "b"');
		});

		it("should prefer shorten variant #3", () => {
			/* eslint-disable no-template-curly-in-string */
			expect(
				runtimeTemplate.concatenation(
					"a",
					{ expr: /** @type {string} */ (/** @type {unknown} */ (1)) },
					"b"
				)
			).toBe("`a${1}b`");
			/* eslint-enable */
		});
	});
});

describe("RuntimeTemplate.optionalChaining", () => {
	/**
	 * @param {boolean} optionalChaining whether the environment supports optional chaining
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = (optionalChaining) =>
		new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { optionalChaining } })
			),
			new RequestShortener(__dirname)
		);

	it("uses optional chaining when supported", () => {
		const runtimeTemplate = create(true);
		expect(runtimeTemplate.optionalChaining("obj", "prop")).toBe("obj?.prop");
		expect(runtimeTemplate.optionalChaining("fn", "()")).toBe("fn?.()");
		expect(runtimeTemplate.optionalChaining("obj", "method(arg)")).toBe(
			"obj?.method(arg)"
		);
		expect(runtimeTemplate.optionalChaining("obj", "[key]")).toBe("obj?.[key]");
	});

	it("falls back to && when not supported", () => {
		const runtimeTemplate = create(false);
		expect(runtimeTemplate.optionalChaining("obj", "prop")).toBe(
			"obj && obj.prop"
		);
		expect(runtimeTemplate.optionalChaining("fn", "()")).toBe("fn && fn()");
		expect(runtimeTemplate.optionalChaining("obj", "method(arg)")).toBe(
			"obj && obj.method(arg)"
		);
		expect(runtimeTemplate.optionalChaining("obj", "[key]")).toBe(
			"obj && obj[key]"
		);
	});
});

describe("RuntimeTemplate.method", () => {
	/**
	 * @param {boolean} methodShorthand whether the environment supports method shorthand
	 * @param {boolean} arrowFunction whether the environment supports arrow functions
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = (methodShorthand, arrowFunction) =>
		new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({
					environment: { methodShorthand, arrowFunction }
				})
			),
			new RequestShortener(__dirname)
		);

	it("uses method shorthand when supported", () => {
		const runtimeTemplate = create(true, true);
		expect(runtimeTemplate.method("get", "name", "return name;")).toBe(
			"get(name) {\n\treturn name;\n}"
		);
	});

	it("falls back to an arrow property when shorthand is unsupported", () => {
		const runtimeTemplate = create(false, true);
		expect(runtimeTemplate.method("get", "name", "return name;")).toBe(
			"get: (name) => {\n\treturn name;\n}"
		);
	});

	it("falls back to a function property without arrow support", () => {
		const runtimeTemplate = create(false, false);
		expect(runtimeTemplate.method("get", "name", "return name;")).toBe(
			"get: function(name) {\n\treturn name;\n}"
		);
	});
});

describe("RuntimeTemplate.objectHasOwn", () => {
	/**
	 * @param {boolean} hasOwn whether the environment supports `Object.hasOwn`
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = (hasOwn) =>
		new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { hasOwn } })
			),
			new RequestShortener(__dirname)
		);

	it("uses Object.hasOwn when supported", () => {
		expect(create(true).objectHasOwn("obj", "prop")).toBe(
			"Object.hasOwn(obj, prop)"
		);
	});

	it("falls back to hasOwnProperty.call when not supported", () => {
		expect(create(false).objectHasOwn("obj", "prop")).toBe(
			"Object.prototype.hasOwnProperty.call(obj, prop)"
		);
	});
});

describe("RuntimeTemplate.assignOr", () => {
	/**
	 * @param {boolean} logicalAssignment whether the environment supports logical assignment
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = (logicalAssignment) =>
		new RuntimeTemplate(
			/** @type {import("../lib/Compilation")} */ (
				/** @type {unknown} */ (undefined)
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({ environment: { logicalAssignment } })
			),
			new RequestShortener(__dirname)
		);

	it("uses ||= when supported", () => {
		expect(create(true).assignOr("scope[name]", "{}")).toBe(
			"scope[name] ||= {}"
		);
	});

	it("falls back to self-assignment when not supported", () => {
		expect(create(false).assignOr("scope[name]", "{}")).toBe(
			"scope[name] = scope[name] || {}"
		);
	});
});

describe("RuntimeTemplate.supportsAnalyzable", () => {
	/** @typedef {import("../lib/ChunkGraph")} ChunkGraph */
	/** @typedef {import("../lib/Compilation")} Compilation */
	/** @typedef {import("../lib/Module")} Module */

	/** Stands for the module a reference is emitted into; no field of it is read. */
	const module = /** @type {Module} */ (/** @type {unknown} */ ({}));

	/**
	 * @param {object} options overrides
	 * @param {Record<string, EXPECTED_ANY>=} options.output `output` overrides
	 * @param {(string | false)=} options.devtool the configured devtool
	 * @param {string[]=} options.bailouts collects the recorded bailout reasons
	 * @returns {RuntimeTemplate} runtime template
	 */
	const create = ({ output, devtool = false, bailouts = [] }) =>
		new RuntimeTemplate(
			/** @type {Compilation} */ (
				/** @type {unknown} */ ({
					options: { devtool, optimization: { realContentHash: true } },
					chunks: [],
					modules: [],
					moduleGraph: { getOptimizationBailout: () => bailouts }
				})
			),
			/** @type {OutputOptions} */ (
				/** @type {unknown} */ ({
					module: true,
					chunkFormat: "module",
					importFunctionName: "import",
					publicPath: "auto",
					webassemblyModuleFilename: "[hash].module.wasm",
					globalObject: "self",
					hashDigestLength: 20,
					environment: { module: true },
					...output
				})
			),
			new RequestShortener(__dirname)
		);

	/**
	 * @param {EXPECTED_ANY[]=} chunksOfModule chunks the module is placed in
	 * @returns {{ chunkGraph: ChunkGraph, reads: () => number }} a counting chunk graph
	 */
	const countingChunkGraph = (chunksOfModule = []) => {
		let reads = 0;
		const chunkGraph = /** @type {ChunkGraph} */ (
			/** @type {unknown} */ ({
				getModuleChunksIterable: () => {
					reads++;
					return chunksOfModule;
				},
				getModuleRuntimes: () => {
					reads++;
					return [];
				}
			})
		);
		return { chunkGraph, reads: () => reads };
	};

	/**
	 * @param {string | undefined} chunkLoading how this worker entry loads chunks
	 * @returns {EXPECTED_ANY} a chunk standing for a worker entry
	 */
	const workerChunk = (chunkLoading) => ({
		getEntryOptions: () => ({ worker: true, chunkLoading })
	});

	it("should refuse every form unless the build emits ESM", () => {
		const template = create({ output: { module: false } });
		const { chunkGraph } = countingChunkGraph();

		expect({
			import: template.supportsAnalyzable("import", chunkGraph, module),
			url: template.supportsAnalyzable("url", chunkGraph, module),
			wasm: template.supportsAnalyzable("wasm"),
			wasmRelative: template.supportsAnalyzable("wasm-relative")
		}).toEqual({
			import: false,
			url: false,
			wasm: false,
			wasmRelative: false
		});
	});

	// A chunk `import()` is emitted by the module chunk loader whatever the target
	// reads; `import.meta` in a url is syntax the target has to read itself.
	it("should ask for ESM syntax only where the reference spells it", () => {
		const reads = create({});
		const doesNot = create({ output: { environment: { module: false } } });
		const { chunkGraph } = countingChunkGraph();

		expect({
			readsImport: reads.supportsAnalyzable("import", chunkGraph, module),
			readsUrl: reads.supportsAnalyzable("url"),
			doesNotImport: doesNot.supportsAnalyzable("import", chunkGraph, module),
			doesNotUrl: doesNot.supportsAnalyzable("url")
		}).toEqual({
			readsImport: true,
			readsUrl: true,
			doesNotImport: true,
			doesNotUrl: false
		});
	});

	// The literal replaces `__webpack_require__.e`, which only a native `import()`
	// chunk loader is interchangeable with.
	it("should refuse an import the chunk loader would not spell", () => {
		const { chunkGraph } = countingChunkGraph();

		expect({
			array: create({
				output: { chunkFormat: "array-push" }
			}).supportsAnalyzable("import", chunkGraph, module),
			renamed: create({
				output: { importFunctionName: "__webpack_import__" }
			}).supportsAnalyzable("import", chunkGraph, module),
			both: create({}).supportsAnalyzable("import", chunkGraph, module)
		}).toEqual({ array: false, renamed: false, both: true });
	});

	// A worker on its own chunk loader keeps that runtime; one on `import` shares the
	// ESM loader with the main graph, so the literal reaches the same chunk.
	it("should follow a worker entry's own chunk loading", () => {
		const cases = {
			importWorker: workerChunk("import"),
			jsonpWorker: workerChunk("jsonp"),
			nodeWorker: workerChunk("async-node")
		};
		/** @type {Record<string, boolean>} */
		const answers = {};
		for (const [name, chunk] of Object.entries(cases)) {
			const { chunkGraph } = countingChunkGraph([chunk]);
			answers[name] = create({}).supportsAnalyzable(
				"import",
				chunkGraph,
				module
			);
		}

		expect(answers).toEqual({
			importWorker: true,
			jsonpWorker: false,
			nodeWorker: false
		});
	});

	// A non-worker entry carries `chunkLoading` too, and it is not the worker's.
	it("should ignore chunk loading on an entry that is not a worker", () => {
		const { chunkGraph } = countingChunkGraph([
			{ getEntryOptions: () => ({ chunkLoading: "jsonp" }) },
			{ getEntryOptions: () => undefined }
		]);

		expect(create({}).supportsAnalyzable("import", chunkGraph, module)).toBe(
			true
		);
	});

	// `eval` devtool wraps each module in `eval(...)`, where `import.meta` is a syntax
	// error — but a literal `import()` parses inside it unharmed.
	it("should keep import but drop url under an eval devtool", () => {
		const template = create({ devtool: "eval-cheap-source-map" });
		const { chunkGraph } = countingChunkGraph();

		expect({
			import: template.supportsAnalyzable("import", chunkGraph, module),
			url: template.supportsAnalyzable("url", chunkGraph, module)
		}).toEqual({ import: true, url: false });
	});

	// Build-time execution runs the module in a vm wrapper that does not parse
	// `import.meta`; without a chunk graph there is no such wrapper to worry about.
	it("should drop a url under build-time execution only", () => {
		const template = create({});
		const buildTime = /** @type {ChunkGraph} */ (
			/** @type {unknown} */ ({ buildTimeExecution: true })
		);

		expect({
			buildTime: template.supportsAnalyzable("url", buildTime, module),
			noGraph: template.supportsAnalyzable("url", undefined, module)
		}).toEqual({ buildTime: false, noGraph: true });
	});

	// A bare relative url is what `__webpack_require__.p + path` means only under an
	// `auto` public path; anything else has to be baked whole instead.
	it("should allow a relative wasm path only under an auto public path", () => {
		expect({
			auto: create({}).supportsAnalyzable("wasm-relative"),
			rooted: create({
				output: { publicPath: "/static/" }
			}).supportsAnalyzable("wasm-relative"),
			url: create({
				output: { publicPath: "https://cdn.test/" }
			}).supportsAnalyzable("wasm-relative")
		}).toEqual({ auto: true, rooted: false, url: false });
	});

	// A wasm loader is emitted once per runtime, so its answer cannot depend on where
	// one module sits. That the two wasm forms therefore skip the chunk graph is not
	// unit-testable — the decision short-circuits before reading it unless a real
	// build registered a `__webpack_public_path__` reassignment — so the case that
	// pins it is configCases/wasm/analyzable-runtime-scope.
	it("should walk the origin module's chunks once for an import", () => {
		const { chunkGraph, reads } = countingChunkGraph();
		create({}).supportsAnalyzable("import", chunkGraph, module);

		expect(reads()).toBe(1);
	});

	// `stats.optimizationBailout` is the channel this reports through, and one module
	// may write many references that bail for the same reason.
	it("should record each distinct bailout reason once", () => {
		/** @type {string[]} */
		const bailouts = [];
		const template = create({ devtool: "eval", bailouts });
		template.supportsAnalyzable("url", undefined, module);
		template.supportsAnalyzable("url", undefined, module);

		expect(bailouts).toEqual([
			'Analyzable ESM bailout: devtool "eval" wraps the module in eval(), where import.meta does not parse'
		]);
	});

	// Nothing to report against, and reporting is silent outside ESM output anyway.
	it("should record nothing without a module to hang it on", () => {
		/** @type {string[]} */
		const bailouts = [];
		create({ devtool: "eval", bailouts }).supportsAnalyzable("url");

		expect(bailouts).toEqual([]);
	});
});
