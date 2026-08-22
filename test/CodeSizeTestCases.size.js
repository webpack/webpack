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
const codeSizeBaselineDrift = require("./helpers/codeSizeBaselineDrift");
const codeSizeReportPrefixes = require("./helpers/codeSizeReportPrefixes");
const prepareOptions = require("./helpers/prepareOptions");

/**
 * @import {
 * 	AssetInfo,
 * 	Compilation,
 * 	Compiler,
 * 	Configuration,
 * 	MultiCompiler,
 * 	MultiStats,
 * 	Stats
 * } from ".."
 */

/** @typedef {"raw" | "gzip" | "brotli" | "zstd"} Metric */
/** @typedef {Record<Metric, number>} Metrics */

/**
 * @typedef {object} CaseResult
 * @property {Metrics} metrics summed over every emitted asset
 * @property {Record<string, Metrics>} assets metrics per normalized asset name
 * @property {Record<string, string[]>} runtimes runtime module names per runtime,
 * sorted — how many a runtime carries, and which ones, is the deterministic half
 * of what this measures; their bytes in isolation are not what anyone downloads
 * @property {number} errors number of compilation errors
 * @property {string=} noOutput why the case emitted nothing — a build a case
 * expects to error (its own snapshot records it) counts as measured, not failed:
 * this reports size, it never asserts
 */

/**
 * @typedef {object} Report
 * @property {number} version report format version
 * @property {{ commit?: string, base?: string, node: string, cases: number, assets: number, withoutOutput: number }} meta run metadata
 * @property {Metrics} totals summed over every case
 * @property {Record<string, CaseResult>} cases result per `<category>/<case>`
 */

/**
 * @typedef {object} Change
 * @property {string} name `<case> <asset>`
 * @property {"added" | "removed" | "changed"} status change kind
 * @property {Metrics} before baseline metrics, zeroed when the asset is new
 * @property {Metrics} after current metrics, zeroed when the asset is gone
 * @property {Metrics} delta current minus baseline
 */

/**
 * @typedef {object} RuntimeChange
 * @property {string} name `<case> <runtime>`
 * @property {"added" | "removed" | "changed"} status change kind
 * @property {number} before how many runtime modules it carried
 * @property {number} after how many it carries now
 * @property {string[]} added runtime modules it gained
 * @property {string[]} removed runtime modules it lost
 */

/**
 * @typedef {object} SplitDelta
 * @property {number} changed bytes moved by entries present in both runs
 * @property {number} introduced bytes brought in by new entries, less the ones
 * a deleted entry took away
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
const REPORT_VERSION = 4;

// The settings a CDN serves static assets with, so a delta here is a delta a
// user downloads.
const GZIP_LEVEL = 9;
const BROTLI_QUALITY = 11;
const ZSTD_LEVEL = 19;

/**
 * What the emitted assets weigh: raw is what the generator wrote, the rest is
 * what a user downloads.
 * @type {Metric[]}
 */
const METRICS = ["raw", "gzip", "brotli", "zstd"];

/**
 * What an asset weighs once encoded — reported next to its raw size, since a
 * generator change and what it saves on the wire are not the same number.
 * @type {Metric[]}
 */
const COMPRESSED = ["gzip", "brotli", "zstd"];

/** @type {Record<Metric, string>} */
const METRIC_LABELS = {
	raw: "Raw",
	gzip: `Gzip (${GZIP_LEVEL})`,
	brotli: `Brotli (${BROTLI_QUALITY})`,
	zstd: `Zstd (${ZSTD_LEVEL})`
};

// The workflow greps its own pull request comment by this, so it must not change.
const COMMENT_MARKER = "<!-- code-size-report -->";

// Every table shows the same number of movers; the rest is in the uploaded
// report. Each table gets its own budget, so a pull request adding test cases
// cannot push the assets it changed out of the report with the ones it added.
const MAX_ROWS = 20;

// The hashes webpack states it put in a filename, whatever `output.hashDigest`
// spelled them in. Substituting these exact strings beats matching an alphabet:
// base26/32/64url share theirs with ordinary file names.
/** @type {("fullhash" | "chunkhash" | "modulehash" | "contenthash")[]} */
const HASH_INFO_KEYS = ["fullhash", "chunkhash", "modulehash", "contenthash"];

// Fallback for a hash nothing recorded — one a loader embedded, or a case that
// hashes a name itself. Hex only, since a broader alphabet renames real assets.
const HASH_REGEXP = /[0-9a-f]{8,}/gi;

const UNITS = ["B", "KiB", "MiB", "GiB"];

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

/**
 * @returns {Metrics} zeroed metrics
 */
const createMetrics = () => ({
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
 * @param {number} bytes bytes
 * @returns {string} human readable size, signed
 */
const formatDelta = (bytes) => `${bytes > 0 ? "+" : ""}${formatBytes(bytes)}`;

/**
 * @param {number} before baseline bytes
 * @param {number} after current bytes
 * @returns {string} signed percentage, or a word when there is nothing to divide by
 */
const formatPercent = (before, after) => {
	if (before === after) return "—";
	if (before === 0) return "new";
	if (after === 0) return "gone";
	const percent = ((after - before) / before) * 100;
	return `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
};

/**
 * Growth is red, a shrink green. No arrow emoji carries a color, so the disc
 * says which way it went and the arrow says it in shape too.
 * @param {number} delta byte delta
 * @returns {string} marker for that direction
 */
const changeMarker = (delta) =>
	delta > 0 ? "🔴 ↑" : delta < 0 ? "🟢 ↓" : "🔀";

/**
 * @param {string[]} parts sentence fragments
 * @returns {string} them read as a list
 */
const joinList = (parts) =>
	parts.length < 2
		? parts.join("")
		: `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/**
 * @param {Record<string, Metrics>} before baseline entries
 * @param {Record<string, Metrics>} after current entries
 * @returns {Change[]} changed entries, largest raw delta first
 */
const compareMetrics = (before, after) => {
	/** @type {Change[]} */
	const changes = [];
	for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
		const empty = createMetrics();
		const from = before[name] || empty;
		const to = after[name] || empty;
		const delta = createMetrics();
		for (const metric of METRICS) delta[metric] = to[metric] - from[metric];
		if (METRICS.every((metric) => delta[metric] === 0)) continue;
		changes.push({
			name,
			status:
				name in before ? (name in after ? "changed" : "removed") : "added",
			before: from,
			after: to,
			delta
		});
	}
	// Bytes first, then share of the asset: a fixed addition moves every bundle by
	// the same amount, and the small ones are the ones it actually costs. Ranked
	// on whichever of raw and gzip moved further, so the row budget cannot drop a
	// re-encoding that barely moved raw and cost real bytes on the wire.
	const moved = (/** @type {Change} */ change) =>
		Math.max(Math.abs(change.delta.raw), Math.abs(change.delta.gzip));
	return changes.sort(
		(a, b) =>
			moved(b) - moved(a) ||
			Math.abs(b.delta.raw / (b.before.raw || 1)) -
				Math.abs(a.delta.raw / (a.before.raw || 1))
	);
};

/**
 * Counts how an entry set moved between two runs — the "N changed, N new, N
 * deleted, N unchanged" line, which says at a glance whether a change touched
 * one case or all of them.
 * @template T
 * @param {Record<string, T>} before baseline entries
 * @param {Record<string, T>} after current entries
 * @param {(a: T, b: T) => boolean} equals value comparison
 * @returns {{ changed: number, added: number, removed: number, unchanged: number }} counts
 */
const countChanges = (before, after, equals) => {
	const counts = { changed: 0, added: 0, removed: 0, unchanged: 0 };
	for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
		if (!(name in before)) counts.added++;
		else if (!(name in after)) counts.removed++;
		else if (equals(before[name], after[name])) counts.unchanged++;
		else counts.changed++;
	}
	return counts;
};

/**
 * @param {Metrics} a metrics
 * @param {Metrics} b metrics
 * @returns {boolean} true when every metric matches
 */
const sameMetrics = (a, b) =>
	METRICS.every((metric) => a[metric] === b[metric]);

/**
 * How much an entry set moved in total — the "and by how much" next to the
 * counts, which a count alone does not say. Split by whether the entry exists in
 * both runs: adding a test case brings whole bundles with it, and summed into
 * one number those bytes bury the few a change to `lib/` moved.
 * @template {string} K
 * @param {Record<string, Record<K, number>>} before baseline entries
 * @param {Record<string, Record<K, number>>} after current entries
 * @param {K} key the field to sum
 * @returns {SplitDelta} current minus baseline, over the union of both
 */
const splitDelta = (before, after, key) => {
	const delta = { changed: 0, introduced: 0 };
	for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
		const from = before[name] ? before[name][key] : 0;
		const to = after[name] ? after[name][key] : 0;
		if (name in before && name in after) delta.changed += to - from;
		else delta.introduced += to - from;
	}
	return delta;
};

/**
 * @param {Report} report report
 * @returns {Record<string, Metrics>} metrics per case
 */
const caseMetrics = (report) =>
	Object.fromEntries(
		Object.entries(report.cases).map(([name, result]) => [name, result.metrics])
	);

/**
 * @param {Report} report report
 * @returns {Record<string, Metrics>} metrics per `<case> <asset>`
 */
const assetMetrics = (report) => {
	/** @type {Record<string, Metrics>} */
	const assets = {};
	for (const [name, result] of Object.entries(report.cases)) {
		for (const [asset, metrics] of Object.entries(result.assets)) {
			assets[`${name} ${asset}`] = metrics;
		}
	}
	return assets;
};

/**
 * @param {Report} report report
 * @returns {Record<string, string[]>} runtime module names per `<case> <runtime>`
 */
const runtimeModules = (report) => {
	/** @type {Record<string, string[]>} */
	const runtimes = {};
	for (const [name, result] of Object.entries(report.cases)) {
		for (const [runtime, names] of Object.entries(result.runtimes)) {
			runtimes[`${name} ${runtime}`] = names;
		}
	}
	return runtimes;
};

/**
 * @param {Record<string, string[]>} before baseline runtimes
 * @param {Record<string, string[]>} after current runtimes
 * @returns {RuntimeChange[]} runtimes whose module set moved, most moved first
 */
const compareRuntimes = (before, after) =>
	[...new Set([...Object.keys(before), ...Object.keys(after)])]
		.map((name) => {
			const was = before[name] || [];
			const now = after[name] || [];
			const wasSet = new Set(was);
			const nowSet = new Set(now);
			return {
				name,
				status: /** @type {RuntimeChange["status"]} */ (
					name in before ? (name in after ? "changed" : "removed") : "added"
				),
				before: was.length,
				after: now.length,
				added: now.filter((entry) => !wasSet.has(entry)),
				removed: was.filter((entry) => !nowSet.has(entry))
			};
		})
		.filter((row) => row.added.length > 0 || row.removed.length > 0)
		.sort(
			(a, b) =>
				b.added.length +
					b.removed.length -
					(a.added.length + a.removed.length) || a.name.localeCompare(b.name)
		);

/**
 * One collapsible section per table, so every table carries its own row budget
 * and its own count rather than competing for one.
 * @param {object} section section to render
 * @param {string} section.summary what the section holds
 * @param {string[]} section.header the header row and its alignment row
 * @param {string[]} section.rows body rows, already rendered
 * @param {number} section.columns how many columns the table has
 * @param {number=} section.noteColumn column the truncation note goes in
 * @param {boolean=} section.open whether it renders unfolded
 * @returns {string[]} markdown lines
 */
const formatSection = ({
	summary,
	header,
	rows,
	columns,
	noteColumn = 0,
	open = false
}) => {
	/** @type {string[]} */
	const lines = [
		`<details${open ? " open" : ""}><summary>${summary}</summary>`,
		"",
		...header,
		...rows.slice(0, MAX_ROWS)
	];
	if (rows.length > MAX_ROWS) {
		const cells = Array.from({ length: columns }, () => "");
		cells[noteColumn] =
			`… ${rows.length - MAX_ROWS} more, see the uploaded report`;
		lines.push(`| ${cells.join(" | ")} |`);
	}
	lines.push("", "</details>", "");
	return lines;
};

/**
 * The assets a change moved: they exist in both runs, so before and after are
 * comparable and the delta is the number the report exists for. Unfolded, and
 * kept clear of the assets a new test case brought in — a whole new bundle
 * outweighs every real change, which is what used to bury them.
 * @param {Change[]} changes changed assets, largest raw delta first
 * @returns {string[]} markdown lines
 */
const formatChangedAssets = (changes) => {
	if (changes.length === 0) return [];

	// Raw is what the generator wrote; the rest is what each encoding makes of it
	// — the byte delta is spelled out because the percentage of it varies with
	// bundle size.
	const rows = changes.map((change) => {
		// The arrow reads before the numbers do, so it follows the column that
		// decides: gzip, then raw, then whatever else moved.
		const direction =
			change.delta.gzip ||
			change.delta.raw ||
			COMPRESSED.reduce((sum, metric) => sum + change.delta[metric], 0);
		// Bytes as well as the percentage: on a small asset a real move rounds to
		// `0.00%`, and a percentage is not a thing two rows can be added up over.
		const compressed = COMPRESSED.map((metric) =>
			change.delta[metric] === 0
				? "—"
				: `${formatDelta(change.delta[metric])} (${formatPercent(
						change.before[metric],
						change.after[metric]
					)})`
		).join(" | ");
		return `| ${changeMarker(direction)} | \`${change.name}\` | ${formatBytes(
			change.before.raw
		)} | ${formatBytes(change.after.raw)} | **${formatDelta(
			change.delta.raw
		)}** (${formatPercent(change.before.raw, change.after.raw)}) | ${compressed} |`;
	});

	return formatSection({
		summary: `${changes.length} asset(s) changed size${
			changes.length > MAX_ROWS
				? `, biggest ${MAX_ROWS} by raw or gzip change`
				: ""
		}`,
		header: [
			`| | Asset | Before | After | Change | ${COMPRESSED.map(
				(metric) => METRIC_LABELS[metric]
			).join(" | ")} |`,
			`| :-: | :-- | --: | --: | --: |${COMPRESSED.map(() => " --: |").join("")}`
		],
		rows,
		columns: 5 + COMPRESSED.length,
		noteColumn: 1,
		open: true
	});
};

/**
 * The assets one run has and the other does not — what a pull request adding or
 * deleting test cases produces. Their size is a size, never a delta: there is
 * nothing to compare it against, so it is reported apart and folded away.
 * @param {Change[]} changes added or removed assets
 * @param {"added" | "removed"} status which of the two
 * @returns {string[]} markdown lines
 */
const formatIntroducedAssets = (changes, status) => {
	if (changes.length === 0) return [];

	const added = status === "added";
	const metricsOf = (/** @type {Change} */ change) =>
		added ? change.after : change.before;
	const rows = [...changes]
		.sort((a, b) => metricsOf(b).raw - metricsOf(a).raw)
		.map((change) => {
			const metrics = metricsOf(change);
			return `| ${added ? "➕" : "➖"} | \`${change.name}\` | ${formatBytes(
				metrics.raw
			)} | ${COMPRESSED.map((metric) => formatBytes(metrics[metric])).join(
				" | "
			)} |`;
		});

	return formatSection({
		summary: `${changes.length} asset(s) ${
			added ? "this pull request adds" : "this pull request no longer emits"
		}${changes.length > MAX_ROWS ? `, biggest ${MAX_ROWS} by raw size` : ""}`,
		header: [
			`| | Asset | ${METRICS.map((metric) => METRIC_LABELS[metric]).join(" | ")} |`,
			`| :-: | :-- |${METRICS.map(() => " --: |").join("")}`
		],
		rows,
		columns: 2 + METRICS.length,
		noteColumn: 1
	});
};

/**
 * How many runtime modules each runtime carries, and which ones came or went.
 * A count is what a change to `lib/runtime/` moves deterministically, and the
 * names say what moved — the bytes are already in the asset table. Split the
 * same way the assets are: a runtime a new case brought in gained nothing.
 * @param {Report} report current report
 * @param {Report} baseline baseline report
 * @returns {string[]} markdown lines
 */
const formatRuntimes = (report, baseline) => {
	const rows = compareRuntimes(
		runtimeModules(baseline),
		runtimeModules(report)
	);
	const changed = rows.filter((row) => row.status === "changed");
	const introduced = rows.filter((row) => row.status !== "changed");

	if (rows.length === 0) {
		return ["No runtime gained or lost a runtime module.", ""];
	}

	const list = (/** @type {string[]} */ names) =>
		names.length === 0 ? "—" : names.map((name) => `\`${name}\``).join(", ");

	/** @type {string[]} */
	const lines = [];
	if (changed.length > 0) {
		lines.push(
			...formatSection({
				summary: `${
					changed.length
				} runtime(s) changed which runtime modules they carry${
					changed.length > MAX_ROWS
						? `, biggest ${MAX_ROWS} by number moved`
						: ""
				}`,
				header: [
					"| | Runtime | Modules | Added | Removed |",
					"| :-: | :-- | --: | :-- | :-- |"
				],
				rows: changed.map(
					(row) =>
						`| ${changeMarker(row.after - row.before)} | \`${row.name}\` | ${
							row.before === row.after
								? row.after
								: `${row.before} → ${row.after}`
						} | ${list(row.added)} | ${list(row.removed)} |`
				),
				columns: 5,
				noteColumn: 1,
				open: true
			})
		);
	} else {
		lines.push(
			"No runtime that both runs build changed which runtime modules it carries.",
			""
		);
	}

	if (introduced.length > 0) {
		lines.push(
			...formatSection({
				summary: `${introduced.length} runtime(s) this pull request adds or no longer builds`,
				header: ["| | Runtime | Modules |", "| :-: | :-- | --: |"],
				rows: introduced.map(
					(row) =>
						`| ${row.status === "added" ? "➕" : "➖"} | \`${row.name}\` | ${
							row.status === "added" ? row.after : `${row.before} (gone)`
						} |`
				),
				columns: 3,
				noteColumn: 1
			})
		);
	}

	return lines;
};

/**
 * With no baseline there is nothing to diff, so rank what the suite emits —
 * which is the other question worth asking of an asset: what is the big one.
 * @param {Report} report current report
 * @returns {string[]} markdown lines
 */
const formatBiggestAssets = (report) => {
	const assets = Object.entries(assetMetrics(report)).sort(
		(a, b) => b[1].raw - a[1].raw
	);
	if (assets.length === 0) return [];

	return formatSection({
		summary: `${assets.length} asset(s) emitted${
			assets.length > MAX_ROWS ? `, biggest ${MAX_ROWS} by raw size` : ""
		}`,
		header: [
			`| Asset | ${METRICS.map((metric) => METRIC_LABELS[metric]).join(" | ")} |`,
			`| :-- |${METRICS.map(() => " --: |").join("")}`
		],
		rows: assets.map(
			([name, metrics]) =>
				`| \`${name}\` | ${METRICS.map((metric) =>
					formatBytes(metrics[metric])
				).join(" | ")} |`
		),
		columns: 1 + METRICS.length
	});
};

/**
 * The verdict sentence: what a reviewer reads before anything else, so it says
 * how much of the report below is a change and how much of it is new.
 * @param {Change[]} changed assets present in both runs whose size moved
 * @param {Change[]} added assets only this run emits
 * @param {Change[]} removed assets only the baseline emitted
 * @returns {string} one sentence
 */
const formatVerdict = (changed, added, removed) => {
	/** @type {string[]} */
	const parts = [];
	if (changed.length > 0) {
		parts.push(`**changes the size of ${changed.length} asset(s)**`);
	}
	if (added.length > 0) parts.push(`adds ${added.length} new asset(s)`);
	if (removed.length > 0) parts.push(`deletes ${removed.length} asset(s)`);
	return parts.length === 0
		? "Merging this pull request will **not change** the code webpack generates."
		: `Merging this pull request ${joinList(parts)}.`;
};

/**
 * @param {Report} report current report
 * @param {Report=} baseline baseline report
 * @param {string=} noBaselineReason why there is nothing to compare against
 * @returns {string} markdown summary
 */
const formatMarkdown = (report, baseline, noBaselineReason) => {
	/** @type {string[]} */
	const lines = [
		// Lets the workflow find its own comment and update it in place instead of
		// posting a new one on every push.
		COMMENT_MARKER,
		"## Generated code size",
		""
	];

	const built = `Built \`test/configCases\` with the defaults a user gets: ${
		report.meta.cases
	} case(s), ${report.meta.assets} asset(s)${
		report.meta.withoutOutput > 0
			? `, ${report.meta.withoutOutput} emitted nothing`
			: ""
	}.`;

	if (!baseline) {
		lines.push(
			built,
			"",
			`${noBaselineReason}, so there is nothing to compare against yet.`,
			"",
			...formatBiggestAssets(report)
		);
		return `${lines.join("\n")}\n`;
	}

	const changes = compareMetrics(assetMetrics(baseline), assetMetrics(report));
	const changed = changes.filter((change) => change.status === "changed");
	const added = changes.filter((change) => change.status === "added");
	const removed = changes.filter((change) => change.status === "removed");

	const rows = [
		{
			label: "Cases",
			counts: countChanges(
				caseMetrics(baseline),
				caseMetrics(report),
				sameMetrics
			),
			change: splitDelta(caseMetrics(baseline), caseMetrics(report), "raw"),
			gzip: splitDelta(caseMetrics(baseline), caseMetrics(report), "gzip")
		},
		{
			label: "Assets",
			counts: countChanges(
				assetMetrics(baseline),
				assetMetrics(report),
				sameMetrics
			),
			change: splitDelta(assetMetrics(baseline), assetMetrics(report), "raw"),
			gzip: splitDelta(assetMetrics(baseline), assetMetrics(report), "gzip")
		},
		{
			// A runtime carries no bytes of its own — its modules land in the assets
			// above — so this row counts runtimes and leaves the byte columns empty.
			label: "Runtimes",
			counts: countChanges(
				runtimeModules(baseline),
				runtimeModules(report),
				(a, b) => a.length === b.length && a.every((name, i) => name === b[i])
			),
			change: { changed: 0, introduced: 0 },
			gzip: { changed: 0, introduced: 0 }
		}
	];
	const short = (/** @type {Report} */ report) =>
		report.meta.commit ? `\`${report.meta.commit.slice(0, 7)}\`` : "unknown";
	// A pull request is built from its merge ref, so name both halves of what
	// was measured rather than the head alone.
	const measured = report.meta.base
		? `${short(report)} merged into \`${report.meta.base.slice(0, 7)}\``
		: short(report);
	const drift = codeSizeBaselineDrift(baseline.meta.commit, report.meta.base);

	// How many moved and by how much, then the biggest movers — before any
	// collapsed section, so the whole verdict is readable without unfolding one.
	lines.push(
		`Comparing ${measured} against ${short(baseline)}. ${formatVerdict(
			changed,
			added,
			removed
		)}`,
		"",
		...(drift ? [drift, ""] : []),
		"| | Changed | New | Deleted | Unchanged | Gzip change | Raw change | Gzip new/gone | Raw new/gone |",
		"| :-- | --: | --: | --: | --: | --: | --: | --: | --: |"
	);
	for (const { label, counts, change, gzip } of rows) {
		const delta = (
			/** @type {SplitDelta} */ split,
			/** @type {keyof SplitDelta} */ key
		) =>
			split[key] === 0
				? "—"
				: `${key === "changed" ? `${changeMarker(split[key])} ` : ""}${formatDelta(split[key])}`;
		lines.push(
			`| ${label} | ${counts.changed} | ${counts.added} | ${counts.removed} | ${
				counts.unchanged
			} | ${delta(gzip, "changed")} | ${delta(change, "changed")} | ${delta(
				gzip,
				"introduced"
			)} | ${delta(change, "introduced")} |`
		);
	}
	lines.push(
		"",
		"`Gzip change` decides — it is what a user downloads, and a re-encoding can cut raw bytes while costing wire bytes. `Raw change` is the tiebreak: it is what the generator wrote, so it is what has to be decompressed and parsed. Both are over assets both runs emit; bytes an added or deleted case brings with it are counted apart, under `new/gone`. Brotli and zstd are per asset in the table below.",
		""
	);

	// The asset view: one row per emitted file, so a minifier change reads as the
	// files it shrank rather than as one number over the whole suite. Changed
	// first and unfolded; new and deleted after it, folded away.
	if (changes.length === 0) {
		lines.push("No asset changed size.", "");
	} else {
		if (changed.length === 0) {
			lines.push(
				"No asset that both runs emit changed size — everything below is new or deleted.",
				""
			);
		}
		lines.push(
			...formatChangedAssets(changed),
			...formatIntroducedAssets(added, "added"),
			...formatIntroducedAssets(removed, "removed")
		);
	}

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
			`> ${
				stopped.length
			} case(s) emitted in the baseline and emit nothing here, so part of the delta is theirs: ${stopped
				.map((name) => `\`${name}\``)
				.join(", ")}`,
			""
		);
	}

	lines.push(...formatRuntimes(report, baseline), built);

	return `${lines.join("\n")}\n`;
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
