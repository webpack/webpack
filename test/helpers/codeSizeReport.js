"use strict";

// The size report: what it measures an asset with, and the markdown it renders.
// `CodeSizeTestCases.size.js` builds the cases and drives this — the rendering
// lives here so `CodeSizeReport.unittest.js` can cover it without running one.

const zlib = require("zlib");
const codeSizeBaselineDrift = require("./codeSizeBaselineDrift");

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

const UNITS = ["B", "KiB", "MiB", "GiB"];

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
	// the same amount, and the small ones are the ones it actually costs.
	return changes.sort(
		(a, b) =>
			Math.abs(b.delta.raw) - Math.abs(a.delta.raw) ||
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
		// An edit can keep the raw length and still change how well it packs, so
		// the arrow falls back to the encodings rather than calling that a shrink.
		const direction =
			change.delta.raw ||
			COMPRESSED.reduce((sum, metric) => sum + change.delta[metric], 0);
		const compressed = COMPRESSED.map((metric) =>
			formatPercent(change.before[metric], change.after[metric])
		).join(" | ");
		return `| ${changeMarker(direction)} | \`${change.name}\` | ${formatBytes(
			change.before.raw
		)} | ${formatBytes(change.after.raw)} | **${formatDelta(
			change.delta.raw
		)}** (${formatPercent(change.before.raw, change.after.raw)}) | ${compressed} |`;
	});

	return formatSection({
		summary: `${changes.length} asset(s) changed size${
			changes.length > MAX_ROWS ? `, biggest ${MAX_ROWS} by raw change` : ""
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
			change: splitDelta(caseMetrics(baseline), caseMetrics(report), "raw")
		},
		{
			label: "Assets",
			counts: countChanges(
				assetMetrics(baseline),
				assetMetrics(report),
				sameMetrics
			),
			change: splitDelta(assetMetrics(baseline), assetMetrics(report), "raw")
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
			change: { changed: 0, introduced: 0 }
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
		"| | Changed | New | Deleted | Unchanged | Raw change | Raw new/gone |",
		"| :-- | --: | --: | --: | --: | --: | --: |"
	);
	for (const { label, counts, change } of rows) {
		lines.push(
			`| ${label} | ${counts.changed} | ${counts.added} | ${counts.removed} | ${
				counts.unchanged
			} | ${
				change.changed === 0
					? "—"
					: `${changeMarker(change.changed)} ${formatDelta(change.changed)}`
			} | ${change.introduced === 0 ? "—" : formatDelta(change.introduced)} |`
		);
	}
	lines.push(
		"",
		"`Raw change` is what this pull request moved in assets both runs emit. Bytes an added or deleted case brings with it are counted apart, under `Raw new/gone`.",
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

module.exports = {
	COMMENT_MARKER,
	MAX_ROWS,
	REPORT_VERSION,
	addMetrics,
	compareMetrics,
	compareRuntimes,
	createMetrics,
	formatBytes,
	formatMarkdown,
	measureAsset,
	splitDelta
};
