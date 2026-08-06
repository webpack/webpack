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
const prepareOptions = require("./helpers/prepareOptions");

/** @typedef {import("..").Compilation} Compilation */
/** @typedef {import("..").Compiler} Compiler */
/** @typedef {import("..").Configuration} Configuration */
/** @typedef {import("..").MultiCompiler} MultiCompiler */
/** @typedef {import("..").MultiStats} MultiStats */
/** @typedef {import("..").RuntimeModule} RuntimeModule */
/** @typedef {import("..").Stats} Stats */

/** @typedef {"runtime" | "raw" | "gzip" | "brotli" | "zstd"} Metric */
/** @typedef {Record<Metric, number>} Metrics */

/**
 * @typedef {object} CaseResult
 * @property {Metrics} metrics summed over every emitted asset
 * @property {Record<string, Metrics>} assets metrics per normalized asset name
 * @property {number} errors number of compilation errors
 * @property {string=} noOutput why the case emitted nothing — a build a case
 * expects to error (its own snapshot records it) counts as measured, not failed:
 * this reports size, it never asserts
 */

/**
 * @typedef {object} Report
 * @property {number} version report format version
 * @property {{ commit?: string, node: string, cases: number, assets: number, withoutOutput: number }} meta run metadata
 * @property {Metrics} totals summed over every case
 * @property {Record<string, RuntimeModuleTotals>} runtimeModules per runtime module, over every case
 * @property {Record<string, CaseResult>} cases result per `<category>/<case>`
 */

/**
 * @typedef {object} RuntimeModuleSize
 * @property {number} bytes source bytes, summed when a case has several compilers
 * @property {number} largest source bytes of the biggest single emitted instance
 */

/**
 * What a single runtime module costs across the whole suite — the view that
 * answers "which runtime grew", "what is the biggest thing we emit" and "is
 * this still emitted at all".
 * @typedef {object} RuntimeModuleTotals
 * @property {number} bytes source bytes summed over every case emitting it
 * @property {number} cases number of cases emitting it
 * @property {number} largest source bytes of the biggest single emitted instance
 */

/**
 *
 * What `measureCase` hands back: a `CaseResult` plus the per-runtime-module
 * sizes, which are aggregated over the suite and not kept per case.
 * @typedef {CaseResult & { runtimeModules: Record<string, RuntimeModuleSize> }} MeasuredCase
 */

/**
 * @typedef {object} Change
 * @property {string} name case or asset name
 * @property {"added" | "removed" | "changed"} status change kind
 * @property {Metrics} delta current minus baseline
 * @property {Change[]} assets changed assets, empty for an asset change
 */

/**
 * @typedef {object} Case
 * @property {string} category case category
 * @property {string} name case name
 * @property {string} id `<category>/<case>`
 */

const rootPath = path.resolve(__dirname, "..");
const casesPath = path.join(__dirname, "configCases");
const outputBaseDir = path.join(__dirname, "js", "size");

// Bumped whenever a compression setting or the report shape changes, so a stale
// baseline is reported as incomparable instead of compared against silently.
const REPORT_VERSION = 2;

// The settings a CDN serves static assets with, so a delta here is a delta a
// user downloads.
const GZIP_LEVEL = 9;
const BROTLI_QUALITY = 11;
const ZSTD_LEVEL = 19;

/**
 * `runtime` is the source webpack itself generates into the bundles (runtime
 * modules, uncompressed); the rest is what the emitted assets weigh on the wire.
 * @type {Metric[]}
 */
const METRICS = ["runtime", "raw", "gzip", "brotli", "zstd"];

/** @type {Record<Metric, string>} */
const METRIC_LABELS = {
	runtime: "Runtime modules",
	raw: "Raw",
	gzip: `Gzip (level ${GZIP_LEVEL})`,
	brotli: `Brotli (quality ${BROTLI_QUALITY})`,
	zstd: `Zstd (level ${ZSTD_LEVEL})`
};

const MAX_CASE_ROWS = 40;
const MAX_ASSET_ROWS = 5;

// A `[contenthash]` renames the asset on every content change; the report keys
// on the normalized name so a size change reads as a change, not add + remove.
// Hex only, which is `output.hashDigest`'s default: the other digests share an
// alphabet with ordinary file names, and matching those would rename real
// assets. A case that picks one (`hash/digest`) reports add + remove instead —
// the same bytes, split over two rows.
const HASH_REGEXP = /[0-9a-f]{8,}/gi;

const UNITS = ["B", "KiB", "MiB", "GiB"];

/**
 * @returns {Metrics} zeroed metrics
 */
const createMetrics = () => ({
	runtime: 0,
	raw: 0,
	gzip: 0,
	brotli: 0,
	zstd: 0
});

/**
 * @param {Metrics} target accumulator, mutated
 * @param {Metrics} source metrics to add
 * @returns {Metrics} the accumulator
 */
const addMetrics = (target, source) => {
	for (const metric of METRICS) target[metric] += source[metric];
	return target;
};

/**
 * @param {Buffer} content asset content
 * @returns {Metrics} metrics of one asset
 */
const measureAsset = (content) => ({
	runtime: 0,
	raw: content.length,
	gzip: zlib.gzipSync(content, { level: GZIP_LEVEL }).length,
	brotli: zlib.brotliCompressSync(content, {
		params: {
			[zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
			// Deterministic, and what a static-asset compressor knows up front.
			[zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length
		}
	}).length,
	zstd: zlib.zstdCompressSync(content, {
		params: { [zlib.constants.ZSTD_c_compressionLevel]: ZSTD_LEVEL }
	}).length
});

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
 * @param {Compilation[]} compilations compilations
 * @returns {Record<string, RuntimeModuleSize>} per runtime module webpack generated
 */
const measureRuntimeModules = (compilations) => {
	/** @type {Record<string, RuntimeModuleSize>} */
	const sizes = {};
	for (const compilation of compilations) {
		const { chunkGraph } = compilation;
		/** @type {Set<RuntimeModule>} */
		const seen = new Set();
		for (const chunk of compilation.chunks) {
			for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
				// A runtime module can be attached to several chunks; count it once.
				if (seen.has(module)) continue;
				seen.add(module);
				const name = module.name || module.identifier();
				const size = module.size();
				const entry = sizes[name];
				if (entry) {
					entry.bytes += size;
					entry.largest = Math.max(entry.largest, size);
				} else {
					sizes[name] = { bytes: size, largest: size };
				}
			}
		}
	}
	return sizes;
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
 * @returns {Promise<MeasuredCase>} measured metrics
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

	/** @type {MeasuredCase} */
	const result = {
		metrics: createMetrics(),
		assets: {},
		/** @type {Record<string, RuntimeModuleSize>} */
		runtimeModules: {},
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
	// defaults `optimization.emitOnErrors` to false), and runtime modules it
	// generated never reached an asset — they are not bytes anyone ships.
	/** @type {Set<Compilation>} */
	const emitted = new Set();
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

		// Measured on `emit`, per compiler: the output directory holds what the
		// compilers of one case wrote over each other (and `compareBeforeEmit`
		// skips a file another one already wrote), and once the build is over the
		// asset sources have been replaced by `SizeOnlySource`.
		for (const [index, child] of compilers.entries()) {
			const prefix = compilers.length === 1 ? "" : `${child.name || index}/`;
			child.hooks.emit.tap("CodeSizeMeasure", (compilation) => {
				emitted.add(compilation);
				for (const asset of compilation.getAssets()) {
					const metrics = measureAsset(asset.source.buffer());
					const name = `${prefix}${asset.name.replace(HASH_REGEXP, "[hash]")}`;
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
		result.runtimeModules = measureRuntimeModules(
			compilations.filter((compilation) => emitted.has(compilation))
		);
		for (const { bytes } of Object.values(result.runtimeModules)) {
			result.metrics.runtime += bytes;
		}
		if (emitted.size === 0) {
			result.noOutput = `build: ${result.errors} error(s), nothing emitted`;
		}
	} catch (err) {
		result.noOutput = `build: ${/** @type {Error} */ (err).message}`;
		result.assets = {};
		result.runtimeModules = {};
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

/**
 * @param {number} bytes bytes
 * @returns {string} human readable size
 */
const formatBytes = (bytes) => {
	const sign = bytes < 0 ? "-" : "";
	let value = Math.abs(bytes);
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${sign}${unit === 0 ? value : value.toFixed(2)} ${UNITS[unit]}`;
};

/**
 * @param {Report} baseline baseline report
 * @param {Report} current current report
 * @returns {Change[]} changed cases with their changed assets, biggest first
 */
const compareReports = (baseline, current) => {
	/**
	 * @param {Record<string, Metrics>} before baseline entries
	 * @param {Record<string, Metrics>} after current entries
	 * @returns {Change[]} changed entries, largest gzip delta first
	 */
	const compare = (before, after) => {
		/** @type {Change[]} */
		const changes = [];
		for (const name of new Set([
			...Object.keys(before),
			...Object.keys(after)
		])) {
			const delta = createMetrics();
			for (const metric of METRICS) {
				delta[metric] =
					(after[name] ? after[name][metric] : 0) -
					(before[name] ? before[name][metric] : 0);
			}
			if (METRICS.every((metric) => delta[metric] === 0)) continue;
			changes.push({
				name,
				status:
					name in before ? (name in after ? "changed" : "removed") : "added",
				delta,
				assets: []
			});
		}
		return changes.sort(
			(a, b) => Math.abs(b.delta.gzip) - Math.abs(a.delta.gzip)
		);
	};

	/**
	 * @param {Report} report report
	 * @returns {Record<string, Metrics>} metrics per case
	 */
	const caseMetrics = (report) =>
		Object.fromEntries(
			Object.entries(report.cases).map(([name, result]) => [
				name,
				result.metrics
			])
		);

	const changes = compare(caseMetrics(baseline), caseMetrics(current));
	for (const change of changes) {
		const before = baseline.cases[change.name];
		const after = current.cases[change.name];
		change.assets = compare(
			before ? before.assets : {},
			after ? after.assets : {}
		);
	}
	return changes;
};

const MAX_RUNTIME_ROWS = 25;

/**
 * The per-runtime-module view: what changed in the runtime, what the biggest
 * things we emit are, and what stopped being emitted at all.
 * @param {Report} report current report
 * @param {Report=} baseline baseline report
 * @returns {string[]} markdown lines
 */
const formatRuntimeModules = (report, baseline) => {
	const names = Object.keys(
		baseline
			? { ...baseline.runtimeModules, ...report.runtimeModules }
			: report.runtimeModules
	);
	/** @type {RuntimeModuleTotals} */
	const none = { bytes: 0, cases: 0, largest: 0 };
	const rows = names
		.map((name) => {
			const now = report.runtimeModules[name] || none;
			const before = baseline
				? baseline.runtimeModules[name] || none
				: undefined;
			return { name, now, delta: before ? now.bytes - before.bytes : 0 };
		})
		.filter((row) => (baseline ? row.delta !== 0 : true))
		.sort((a, b) =>
			baseline
				? Math.abs(b.delta) - Math.abs(a.delta)
				: b.now.bytes - a.now.bytes
		);

	if (rows.length === 0) return ["No runtime module changed size."];

	/** @type {string[]} */
	const lines = [
		`<details><summary>${baseline ? `${rows.length} runtime module(s) changed` : `${rows.length} runtime module(s) emitted`}</summary>`,
		"",
		`| Runtime module | Total${baseline ? " | Change" : ""} | In cases | Biggest emitted |`,
		`| :-- | --: |${baseline ? " --: |" : ""} --: | --: |`
	];
	for (const { name, now, delta } of rows.slice(0, MAX_RUNTIME_ROWS)) {
		// `cases: 0` means the baseline emitted it and this run does not — dead
		// runtime, or a case that stopped emitting.
		lines.push(
			`| \`${name}\` | ${formatBytes(now.bytes)}${baseline ? ` | ${delta > 0 ? "+" : ""}${formatBytes(delta)}` : ""} | ${now.cases}${now.cases === 0 ? " (gone)" : ""} | ${formatBytes(now.largest)} |`
		);
	}
	if (rows.length > MAX_RUNTIME_ROWS) {
		lines.push(
			`| … ${rows.length - MAX_RUNTIME_ROWS} more, see the uploaded report |${baseline ? " |" : ""} | | |`
		);
	}
	lines.push("", "</details>", "");

	return lines;
};

/**
 * @param {Report} report current report
 * @param {Report=} baseline baseline report
 * @returns {string} markdown summary
 */
const formatMarkdown = (report, baseline) => {
	/** @type {string[]} */
	const lines = [
		"## Generated code size",
		"",
		`Built \`test/configCases\` with the defaults a user gets: ${report.meta.cases} case(s), ${report.meta.assets} asset(s)${report.meta.withoutOutput > 0 ? `, ${report.meta.withoutOutput} emitted nothing` : ""}.`,
		""
	];

	if (!baseline) {
		lines.push("| Metric | Total |", "| :-- | --: |");
		for (const metric of METRICS) {
			lines.push(
				`| ${METRIC_LABELS[metric]} | ${formatBytes(report.totals[metric])} |`
			);
		}
		lines.push("", ...formatRuntimeModules(report));
		return `${lines.join("\n")}\n`;
	}

	const short = (/** @type {Report} */ report) =>
		report.meta.commit ? `\`${report.meta.commit.slice(0, 7)}\`` : "unknown";

	lines.push(
		`| Metric | Baseline (${short(baseline)}) | Current (${short(report)}) | Change |`,
		"| :-- | --: | --: | --: |"
	);
	for (const metric of METRICS) {
		const before = baseline.totals[metric];
		const delta = report.totals[metric] - before;
		const percent =
			before === 0 ? "new" : `${((delta / before) * 100).toFixed(2)}%`;
		lines.push(
			`| ${METRIC_LABELS[metric]} | ${formatBytes(before)} | ${formatBytes(report.totals[metric])} | ${delta === 0 ? "—" : `${delta > 0 ? "🔺 +" : "🔻 "}${formatBytes(delta)} (${delta > 0 ? "+" : ""}${percent})`} |`
		);
	}
	lines.push("");

	// A case that stops emitting contributes no bytes, which would otherwise read
	// as an improvement. Reported so the delta is explained, not as a failure.
	const stopped = Object.keys(report.cases).filter(
		(name) =>
			report.cases[name].noOutput &&
			baseline.cases[name] &&
			!baseline.cases[name].noOutput
	);
	if (stopped.length > 0) {
		lines.push(
			"> [!NOTE]",
			`> ${stopped.length} case(s) emitted in the baseline and emit nothing here, so part of the delta is theirs: ${stopped.map((name) => `\`${name}\``).join(", ")}`,
			""
		);
	}

	lines.push(...formatRuntimeModules(report, baseline));

	const changes = compareReports(baseline, report);
	if (changes.length === 0) {
		lines.push("No case changed size.");
		return `${lines.join("\n")}\n`;
	}

	const empty = METRICS.map(() => " |").join("");
	/**
	 * @param {Change} change change
	 * @returns {string} one signed cell per metric
	 */
	const cells = ({ delta }) =>
		METRICS.map((metric) =>
			delta[metric] === 0
				? "—"
				: `${delta[metric] > 0 ? "+" : ""}${formatBytes(delta[metric])}`
		).join(" | ");

	lines.push(
		`<details><summary>${changes.length} case(s) changed size</summary>`,
		"",
		`| Case | ${METRICS.map((metric) => METRIC_LABELS[metric]).join(" | ")} |`,
		`| :-- |${METRICS.map(() => " --: |").join("")}`
	);
	for (const change of changes.slice(0, MAX_CASE_ROWS)) {
		lines.push(
			`| \`${change.name}\`${change.status === "changed" ? "" : ` (${change.status})`} | ${cells(change)} |`
		);
		for (const asset of change.assets.slice(0, MAX_ASSET_ROWS)) {
			lines.push(`| &nbsp;&nbsp;↳ \`${asset.name}\` | ${cells(asset)} |`);
		}
		if (change.assets.length > MAX_ASSET_ROWS) {
			lines.push(
				`| &nbsp;&nbsp;↳ … ${change.assets.length - MAX_ASSET_ROWS} more asset(s) |${empty}`
			);
		}
	}
	if (changes.length > MAX_CASE_ROWS) {
		lines.push(
			`| … ${changes.length - MAX_CASE_ROWS} more case(s), see the uploaded report |${empty}`
		);
	}
	lines.push("", "</details>");

	return `${lines.join("\n")}\n`;
};

/**
 * @param {string[]} argv process arguments
 * @returns {Record<string, string>} parsed `--name value` flags
 */
const parseArgs = (argv) => {
	/** @type {Record<string, string>} */
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		if (argv[i].startsWith("--") && argv[i + 1]) {
			args[argv[i].slice(2)] = argv[++i];
		}
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
 * @returns {Report | undefined} the report, or nothing when it can't be compared
 */
const readBaseline = (file) => {
	if (!fs.existsSync(file)) {
		console.log(`No baseline report at ${file}, reporting totals only.`);
		return undefined;
	}
	/** @type {Report} */
	const report = JSON.parse(fs.readFileSync(file, "utf8"));
	if (report.version !== REPORT_VERSION) {
		console.log(
			`Baseline report has format version ${report.version}, this run produces ${REPORT_VERSION} — skipping the comparison.`
		);
		return undefined;
	}
	return report;
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
	/** @type {Record<string, RuntimeModuleTotals>} */
	const runtimeModules = {};

	for (const [index, testCase] of cases.entries()) {
		try {
			const { runtimeModules: perCase, ...result } =
				await measureCase(testCase);
			results[testCase.id] = result;
			for (const [name, { bytes, largest }] of Object.entries(perCase)) {
				const totals = runtimeModules[name];
				if (totals) {
					totals.bytes += bytes;
					totals.cases++;
					totals.largest = Math.max(totals.largest, largest);
				} else {
					runtimeModules[name] = { bytes, cases: 1, largest };
				}
			}
		} catch (err) {
			results[testCase.id] = {
				metrics: createMetrics(),
				assets: {},
				errors: 0,
				noOutput: `harness: ${/** @type {Error} */ (err).message}`
			};
		}
		if ((index + 1) % 100 === 0 || index + 1 === cases.length) {
			console.log(
				`  ${index + 1}/${cases.length} case(s) in ${Math.round((Date.now() - started) / 1000)}s`
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
			node: process.version,
			cases: cases.length,
			assets,
			withoutOutput
		},
		totals,
		runtimeModules: Object.fromEntries(
			Object.entries(runtimeModules).sort((a, b) => b[1].bytes - a[1].bytes)
		),
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

	const summary = formatMarkdown(
		report,
		args.baseline
			? readBaseline(path.resolve(rootPath, args.baseline))
			: undefined
	);
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
