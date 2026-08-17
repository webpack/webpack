"use strict";

// Builds every `test/configCases` case with the defaults a user gets and reports
// how large what webpack generated is. Run through `yarn test:size`; CI compares
// the report against the one `main` last uploaded. Nothing here asserts and
// nothing here fails: a size that moved is information, not a defect.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const webpack = require("..");
const { DEFAULTS } = require("../lib/config/defaults");
const {
	REPORT_VERSION,
	addMetrics,
	createMetrics,
	formatMarkdown,
	measureAsset
} = require("./helpers/codeSizeReport");
const codeSizeReportPrefixes = require("./helpers/codeSizeReportPrefixes");
const prepareOptions = require("./helpers/prepareOptions");

/** @typedef {import("..").AssetInfo} AssetInfo */
/** @typedef {import("..").Compilation} Compilation */
/** @typedef {import("..").Compiler} Compiler */
/** @typedef {import("..").Configuration} Configuration */
/** @typedef {import("..").MultiCompiler} MultiCompiler */
/** @typedef {import("..").MultiStats} MultiStats */
/** @typedef {import("..").Stats} Stats */
/** @typedef {import("./helpers/codeSizeReport").CaseResult} CaseResult */
/** @typedef {import("./helpers/codeSizeReport").Report} Report */

/**
 * @typedef {object} Case
 * @property {string} category case category
 * @property {string} name case name
 * @property {string} id `<category>/<case>`
 */

const rootPath = path.resolve(__dirname, "..");
const casesPath = path.join(__dirname, "configCases");
const outputBaseDir = path.join(__dirname, "js", "size");

// The hashes webpack states it put in a filename, whatever `output.hashDigest`
// spelled them in. Substituting these exact strings beats matching an alphabet:
// base26/32/64url share theirs with ordinary file names.
/** @type {("fullhash" | "chunkhash" | "modulehash" | "contenthash")[]} */
const HASH_INFO_KEYS = ["fullhash", "chunkhash", "modulehash", "contenthash"];

// Fallback for a hash nothing recorded — one a loader embedded, or a case that
// hashes a name itself. Hex only, since a broader alphabet renames real assets.
const HASH_REGEXP = /[0-9a-f]{8,}/gi;

/**
 * A `[contenthash]` renames the asset on every content change, so the report
 * keys on the normalized name — otherwise every size change reads as one asset
 * removed and another added.
 * @param {string} name emitted asset name
 * @param {AssetInfo} info what webpack recorded about it
 * @returns {string} the name with every hash replaced by `[hash]`
 */
const normalizeAssetName = (name, info) => {
	/** @type {string[]} */
	const hashes = [];
	for (const key of HASH_INFO_KEYS) {
		const value = info[key];
		if (typeof value === "string") hashes.push(value);
		else if (Array.isArray(value)) hashes.push(...value);
	}
	let normalized = name;
	// Longest first: a truncated `[contenthash:8]` is a prefix of the full one,
	// and replacing the short one first would leave the rest of it behind.
	for (const hash of hashes.sort((a, b) => b.length - a.length)) {
		if (hash) normalized = normalized.split(hash).join("[hash]");
	}
	return normalized.replace(HASH_REGEXP, "[hash]");
};

// ~60 config cases assert on the generated code from inside a compiler hook,
// which only resolves under jest. Those assertions belong to `ConfigTestCases`
// — and most of them read a bundle this harness deliberately minifies — so the
// global is stubbed out rather than evaluated: every access and call returns the
// stub again, which swallows `expect(x).not.toBe(y)` and friends alike.
/** @type {EXPECTED_ANY} */
const expectStub = new Proxy(() => {}, {
	get: (target, property) => (property === "then" ? undefined : expectStub),
	apply: () => expectStub
});

if (typeof (/** @type {EXPECTED_ANY} */ (globalThis).expect) === "undefined") {
	/** @type {EXPECTED_ANY} */ (globalThis).expect = expectStub;
}

/**
 * Mirrors the `ConfigTestCases` defaults, except for the two that exist only to
 * keep a bundle readable in a test (`output.pathinfo`, minification off): what
 * is measured has to be what a user ships.
 * @param {Configuration} options case configuration, mutated
 * @param {number} index index in a multi-compiler configuration
 * @param {string} testDirectory case directory
 * @param {string} outputDirectory directory to build into
 * @returns {void}
 */
const applyDefaults = (options, index, testDirectory, outputDirectory) => {
	if (!options.context) options.context = testDirectory;
	if (!options.mode) options.mode = "production";
	if (!options.entry) options.entry = "./index.js";
	if (!options.target) options.target = "async-node";
	if (!options.output) options.output = {};
	if (!options.output.path) options.output.path = outputDirectory;
	if (!options.output.filename) {
		options.output.filename = `bundle${index}${
			options.experiments && options.experiments.outputModule ? ".mjs" : ".js"
		}`;
	}
	if (!options.optimization) options.optimization = {};
	// `optimization.minimizer` is deliberately left alone: webpack's default is
	// not `new TerserPlugin()` but two compress passes plus the native CSS and
	// HTML minifiers, so overriding it would report unminified CSS/HTML.
	if (!options.snapshot) options.snapshot = {};
	if (!options.snapshot.managedPaths) {
		options.snapshot.managedPaths = [path.resolve(rootPath, "node_modules")];
	}
	options.infrastructureLogging = {
		...options.infrastructureLogging,
		level: "error",
		progress: false
	};
};

/**
 * Which runtime modules each runtime carries. A count is the deterministic thing
 * to compare — it catches a runtime module added for one target and forgotten for
 * another — and the names say what moved when a count does.
 * @param {Compilation[]} compilations compilations that emitted
 * @param {string} prefix compiler name prefix for a multi-compiler case
 * @returns {Record<string, string[]>} sorted runtime module names per runtime
 */
const collectRuntimes = (compilations, prefix) => {
	/** @type {Record<string, Set<string>>} */
	const perRuntime = {};
	for (const compilation of compilations) {
		const { chunkGraph } = compilation;
		for (const chunk of compilation.chunks) {
			// A worker or `runtimeChunk` runtime is named by a hash, which would
			// rename the row on every content change — same reason asset names are
			// normalized. Several hashed runtimes in one case then share a row and
			// report the union of what they carry, which is stable where their
			// names are not.
			const runtime = (
				typeof chunk.runtime === "string"
					? chunk.runtime
					: chunk.runtime === undefined
						? "*"
						: [...chunk.runtime].sort().join("+")
			).replace(HASH_REGEXP, "[hash]");
			for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
				const key = `${prefix}${runtime}`;
				const names = perRuntime[key] || (perRuntime[key] = new Set());
				// A runtime module can hang off several chunks of one runtime.
				names.add(module.name || module.identifier());
			}
		}
	}
	return Object.fromEntries(
		Object.entries(perRuntime).map(([key, names]) => [key, [...names].sort()])
	);
};

/**
 * @param {Compiler | MultiCompiler} compiler compiler to close
 * @returns {Promise<void>} resolves once closed, errors ignored
 */
const closeCompiler = (compiler) =>
	new Promise((resolve) => {
		const done = () => resolve();
		if ("compilers" in compiler) compiler.close(done);
		else compiler.close(done);
	});

/**
 * Builds one config case and measures every asset it generated.
 * @param {Case} testCase case to measure
 * @returns {Promise<CaseResult>} measured metrics
 */
const measureCase = async ({ category, name }) => {
	const testDirectory = path.join(casesPath, category, name);
	const outputDirectory = path.join(outputBaseDir, category, name);

	fs.rmSync(outputDirectory, { recursive: true, force: true });
	// A few cases write into the output directory from a compiler hook, before
	// webpack itself has created it.
	fs.mkdirSync(outputDirectory, { recursive: true });

	// `experiments.futureDefaults` flips this process-wide default
	// (`lib/config/defaults.js`), so every later case in the same worker hashes
	// its module ids with a different function and changes size for no reason.
	// Restored after the build so a case is measured as if built on its own.
	const hashFunction = DEFAULTS.HASH_FUNCTION;

	/** @type {CaseResult} */
	const result = {
		metrics: createMetrics(),
		assets: {},
		runtimes: {},
		errors: 0
	};

	/** @type {{ afterExecute?: (options: Configuration) => void }} */
	let testConfig = {};
	try {
		// Required, not just read: a case's `test.config.js` may set its fixture up
		// as a side effect of loading (the `browserslist` cases write a package
		// into `node_modules`) and undo it in `afterExecute`.
		testConfig = require(path.join(testDirectory, "test.config.js"));
	} catch (_err) {
		// The case has no test.config.js
	}

	/** @type {Configuration[]} */
	let optionsArr;
	try {
		const options = await prepareOptions(
			require(path.join(testDirectory, "webpack.config.js")),
			{ testPath: outputDirectory }
		);
		optionsArr = Array.isArray(options) ? [...options] : [options];
		for (const [index, options] of optionsArr.entries()) {
			applyDefaults(options, index, testDirectory, outputDirectory);
		}
	} catch (err) {
		result.noOutput = `config: ${/** @type {Error} */ (err).message}`;
		return result;
	}

	/** @type {Compiler | MultiCompiler | undefined} */
	let compiler;
	// `emit` does not run for a compilation whose errors stopped it (production
	// defaults `optimization.emitOnErrors` to false), so it ships no bytes.
	// Kept with the compiler prefix each one is reported under.
	/** @type {Map<Compilation, string>} */
	const emitted = new Map();
	try {
		const activeCompiler = /** @type {Compiler | MultiCompiler} */ (
			webpack(
				/** @type {EXPECTED_ANY} */ (
					optionsArr.length === 1 ? optionsArr[0] : optionsArr
				)
			)
		);
		compiler = activeCompiler;
		const compilers =
			"compilers" in activeCompiler
				? activeCompiler.compilers
				: [activeCompiler];

		const prefixes = codeSizeReportPrefixes(
			compilers.map((child) => child.name)
		);
		// Measured on `emit`, per compiler: the output directory holds what the
		// compilers of one case wrote over each other (and `compareBeforeEmit`
		// skips a file another one already wrote), and once the build is over the
		// asset sources have been replaced by `SizeOnlySource`.
		for (const [index, child] of compilers.entries()) {
			const prefix = prefixes[index];
			child.hooks.emit.tap("CodeSizeMeasure", (compilation) => {
				emitted.set(compilation, prefix);
				for (const asset of compilation.getAssets()) {
					const metrics = measureAsset(asset.source.buffer());
					const name = `${prefix}${normalizeAssetName(asset.name, asset.info)}`;
					// Two hashed assets can normalize to one name; report them as one.
					const existing = result.assets[name];
					result.assets[name] = existing
						? addMetrics(existing, metrics)
						: metrics;
					addMetrics(result.metrics, metrics);
				}
			});
		}

		const stats = /** @type {Stats | MultiStats} */ (
			await new Promise((resolve, reject) => {
				/**
				 * @param {(Error | null)=} err error
				 * @param {(Stats | MultiStats)=} stats stats
				 * @returns {void}
				 */
				const done = (err, stats) => {
					if (err) return reject(err);
					resolve(/** @type {Stats | MultiStats} */ (stats));
				};
				if ("compilers" in activeCompiler) activeCompiler.run(done);
				else activeCompiler.run(done);
			})
		);

		const compilations =
			"stats" in stats
				? stats.stats.map((stats) => stats.compilation)
				: [stats.compilation];
		for (const compilation of compilations) {
			result.errors += compilation.errors.length;
		}
		for (const [compilation, prefix] of emitted) {
			Object.assign(result.runtimes, collectRuntimes([compilation], prefix));
		}
		if (emitted.size === 0) {
			result.noOutput = `build: ${result.errors} error(s), nothing emitted`;
		}
	} catch (err) {
		result.noOutput = `build: ${/** @type {Error} */ (err).message}`;
		result.assets = {};
		result.runtimes = {};
		result.metrics = createMetrics();
	} finally {
		DEFAULTS.HASH_FUNCTION = hashFunction;
		// Also on the error path: an unclosed compiler holds its caches for the
		// rest of the worker's life, and a case that set a fixture up has to be
		// given the chance to remove it again.
		if (compiler) await closeCompiler(compiler);
		if (testConfig.afterExecute) {
			try {
				testConfig.afterExecute(optionsArr[0]);
			} catch (_err) {
				// Best effort: the hook runs after the bundle was executed in the jest
				// suite, and several inspect what executing it produced. Only its
				// teardown half is wanted here.
			}
		}
	}

	return result;
};

/** @type {Set<string>} */
const OPTIONS = new Set([
	"output",
	"baseline",
	"summary",
	"filter",
	"negative-filter"
]);

/**
 * @param {string[]} argv process arguments
 * @returns {Record<string, string>} parsed `--name value` flags
 */
const parseArgs = (argv) => {
	// A fixed key set with no prototype: an unknown `--flag` is a typo worth
	// reporting, and a key like `--__proto__` never reaches an assignment.
	/** @type {Record<string, string>} */
	const args = Object.create(null);
	for (let i = 0; i < argv.length; i++) {
		if (!argv[i].startsWith("--")) continue;
		const key = argv[i].slice(2);
		if (!OPTIONS.has(key)) throw new Error(`Unknown option --${key}`);
		if (!argv[i + 1]) throw new Error(`Option --${key} needs a value`);
		args[key] = argv[++i];
	}
	return args;
};

/**
 * @param {RegExp=} filter positive filter
 * @param {RegExp=} negativeFilter negative filter
 * @returns {Case[]} cases to measure
 */
const discoverCases = (filter, negativeFilter) => {
	/** @type {Case[]} */
	const cases = [];

	for (const category of fs.readdirSync(casesPath).sort()) {
		if (!fs.statSync(path.join(casesPath, category)).isDirectory()) continue;

		for (const name of fs.readdirSync(path.join(casesPath, category)).sort()) {
			const testDirectory = path.join(casesPath, category, name);
			if (
				name.startsWith("_") ||
				!fs.existsSync(path.join(testDirectory, "webpack.config.js"))
			) {
				continue;
			}

			const id = `${category}/${name}`;
			if (filter && !filter.test(id)) continue;
			if (negativeFilter && negativeFilter.test(id)) continue;

			const filterPath = path.join(testDirectory, "test.filter.js");
			if (
				fs.existsSync(filterPath) &&
				!require(filterPath)({ name: "CodeSizeTestCases" })
			) {
				continue;
			}

			cases.push({ category, name, id });
		}
	}

	return cases;
};

/**
 * @param {string} file path to a stored report
 * @returns {{ report?: Report, reason?: string }} the report, or why it cannot be
 * compared against — which the summary states, so a skipped comparison is not
 * mistaken for a missing upload
 */
const readBaseline = (file) => {
	if (!fs.existsSync(file)) {
		return { reason: "No baseline report was found for `main`" };
	}
	/** @type {Report} */
	const report = JSON.parse(fs.readFileSync(file, "utf8"));
	if (report.version !== REPORT_VERSION) {
		return {
			reason: `The baseline report for \`main\` is format version ${report.version} and this run produces ${REPORT_VERSION}`
		};
	}
	return { report };
};

const run = async () => {
	if (typeof zlib.zstdCompressSync !== "function") {
		throw new Error(
			`Measuring code size needs zstd support in zlib (Node.js >= 22.15), got ${process.version}`
		);
	}

	const args = parseArgs(process.argv.slice(2));
	const filter = args.filter || process.env.FILTER;
	const negativeFilter = args["negative-filter"] || process.env.NEGATIVE_FILTER;
	const cases = discoverCases(
		filter ? new RegExp(filter) : undefined,
		negativeFilter ? new RegExp(negativeFilter) : undefined
	);

	if (cases.length === 0) throw new Error("No case matched the filter");

	fs.rmSync(outputBaseDir, { recursive: true, force: true });
	console.log(`Measuring ${cases.length} case(s)…`);

	/** @type {Record<string, CaseResult>} */
	const results = {};
	const started = Date.now();

	// One process, one case at a time. Cases within a category run in order, so a
	// `1-use-*` case still consumes what its `0-create-*` sibling wrote, and a
	// worker pool was measured to be worth about a third of the wall clock — not
	// enough to buy the machinery.
	for (const [index, testCase] of cases.entries()) {
		try {
			results[testCase.id] = await measureCase(testCase);
		} catch (err) {
			results[testCase.id] = {
				metrics: createMetrics(),
				assets: {},
				runtimes: {},
				errors: 0,
				noOutput: `harness: ${/** @type {Error} */ (err).message}`
			};
		}
		if ((index + 1) % 100 === 0 || index + 1 === cases.length) {
			console.log(
				`  ${index + 1}/${cases.length} case(s) in ${Math.round(
					(Date.now() - started) / 1000
				)}s`
			);
		}
	}

	const totals = createMetrics();
	/** @type {Record<string, CaseResult>} */
	const sorted = {};
	let assets = 0;
	let withoutOutput = 0;
	for (const name of Object.keys(results).sort()) {
		sorted[name] = results[name];
		addMetrics(totals, results[name].metrics);
		assets += Object.keys(results[name].assets).length;
		if (results[name].noOutput) withoutOutput++;
	}

	/** @type {Report} */
	const report = {
		version: REPORT_VERSION,
		meta: {
			commit: process.env.CODE_SIZE_COMMIT || readCommit(),
			base: process.env.CODE_SIZE_BASE_COMMIT || undefined,
			node: process.version,
			cases: cases.length,
			assets,
			withoutOutput
		},
		totals,
		cases: sorted
	};

	const outputFile = path.resolve(
		rootPath,
		args.output || path.join("test", "js", "code-size-report.json")
	);
	fs.mkdirSync(path.dirname(outputFile), { recursive: true });
	fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);

	if (withoutOutput > 0) {
		// Informational: most of these are cases whose expected result *is* a
		// build error. Nothing here fails the run.
		console.log(`\n${withoutOutput} case(s) emitted nothing:`);
		for (const [id, result] of Object.entries(sorted)) {
			if (result.noOutput) console.log(`  ${id}: ${result.noOutput}`);
		}
	}
	console.log(`\nReport written to ${path.relative(rootPath, outputFile)}`);

	const baseline = args.baseline
		? readBaseline(path.resolve(rootPath, args.baseline))
		: { reason: "No baseline report was given" };
	const summary = formatMarkdown(report, baseline.report, baseline.reason);
	console.log(`\n${summary}`);
	if (args.summary) {
		fs.appendFileSync(path.resolve(rootPath, args.summary), summary);
	}
};

/**
 * @returns {string | undefined} commit the working tree is at
 */
const readCommit = () => {
	try {
		return execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: rootPath,
			encoding: "utf8"
		}).trim();
	} catch (_err) {
		return undefined;
	}
};

run().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
