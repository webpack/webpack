"use strict";

// The size report's row keys, baseline check and rendered markdown.
// `CodeSizeTestCases.size.js` runs a full build on require, so all three are
// unit-tested through their helpers.

const codeSizeBaselineDrift = require("./helpers/codeSizeBaselineDrift");
const {
	MAX_ROWS,
	compareMetrics,
	compareRuntimes,
	formatBytes,
	formatMarkdown,
	splitDelta
} = require("./helpers/codeSizeReport");
const codeSizeReportPrefixes = require("./helpers/codeSizeReportPrefixes");

/** @typedef {import("./helpers/codeSizeReport").CaseResult} CaseResult */
/** @typedef {import("./helpers/codeSizeReport").Metrics} Metrics */
/** @typedef {import("./helpers/codeSizeReport").Report} Report */

/**
 * @param {number} raw raw bytes
 * @returns {Metrics} metrics whose encodings follow the raw size
 */
const metrics = (raw) => ({
	raw,
	gzip: Math.round(raw * 0.4),
	brotli: Math.round(raw * 0.35),
	zstd: Math.round(raw * 0.36)
});

/**
 * @param {Record<string, Metrics>} assets assets the case emits
 * @param {Record<string, string[]>=} runtimes runtime modules per runtime
 * @returns {CaseResult} the case result
 */
const caseResult = (assets, runtimes) => {
	const total = metrics(0);
	for (const asset of Object.values(assets)) {
		for (const metric of /** @type {(keyof Metrics)[]} */ (
			Object.keys(total)
		)) {
			total[metric] += asset[metric];
		}
	}
	return { metrics: total, assets, runtimes: runtimes || {}, errors: 0 };
};

/**
 * @param {string} commit commit the report was measured at
 * @param {Record<string, CaseResult>} cases case results
 * @returns {Report} a report over them
 */
const report = (commit, cases) => ({
	version: 4,
	meta: {
		commit,
		node: "v22.0.0",
		cases: Object.keys(cases).length,
		assets: Object.values(cases).reduce(
			(count, result) => count + Object.keys(result.assets).length,
			0
		),
		withoutOutput: 0
	},
	totals: metrics(0),
	cases
});

const BASELINE = report("a".repeat(40), {
	"css/basic": caseResult(
		{ "bundle0.js": metrics(4200), "main.css": metrics(900) },
		{ main: ["webpack/runtime/css loading", "webpack/runtime/hasOwnProperty"] }
	),
	"asset-modules/basic": caseResult({ "bundle0.js": metrics(12000) })
});

// What a pull request adding a test case produces: two assets it changed, and
// far bigger ones it only added.
const WITH_NEW_CASE = report("b".repeat(40), {
	"css/basic": caseResult(
		{ "bundle0.js": metrics(4150), "main.css": metrics(880) },
		{ main: ["webpack/runtime/css loading"] }
	),
	"asset-modules/basic": caseResult({ "bundle0.js": metrics(12000) }),
	"my-feature/case": caseResult(
		{ "bundle0.js": metrics(21000), "chunk.js": metrics(6000) },
		{ main: ["webpack/runtime/jsonp"] }
	)
});

describe("codeSizeReportPrefixes", () => {
	it("gives a lone compiler no prefix", () => {
		expect(codeSizeReportPrefixes(["only"])).toEqual([""]);
		expect(codeSizeReportPrefixes([undefined])).toEqual([""]);
	});

	it("keeps the plain name when every name is distinct", () => {
		expect(codeSizeReportPrefixes(["a", "b"])).toEqual(["a/", "b/"]);
	});

	it("falls back to the index for an unnamed compiler", () => {
		expect(codeSizeReportPrefixes([undefined, "b"])).toEqual(["0/", "b/"]);
	});

	it("indexes only the names that repeat", () => {
		expect(codeSizeReportPrefixes(["a", "a", "a", "b"])).toEqual([
			"a[0]/",
			"a[1]/",
			"a[2]/",
			"b/"
		]);
	});

	it("collides a name with the index an unnamed compiler falls back to", () => {
		// `"1"` and the number `1` render the one prefix, so both take an index.
		expect(codeSizeReportPrefixes(["1", undefined])).toEqual([
			"1[0]/",
			"1[1]/"
		]);
	});

	it("widens a key a configured name already spells", () => {
		// The second `foo` wants `foo[1]/`, which is the third compiler's name.
		expect(codeSizeReportPrefixes(["foo", "foo", "foo[1]"])).toEqual([
			"foo[0]/",
			"foo[1]/",
			"foo[1][2]/"
		]);
		expect(codeSizeReportPrefixes(["foo[0]", "foo", "foo"])).toEqual([
			"foo[0]/",
			"foo[1]/",
			"foo[2]/"
		]);
	});

	it("never repeats a key", () => {
		const names = ["a", "a", "a[1]", "a[1]", "a[1][3]", undefined, "5", "a"];
		const prefixes = codeSizeReportPrefixes(names);
		expect(new Set(prefixes).size).toBe(names.length);
	});
});

describe("codeSizeBaselineDrift", () => {
	const base = "e3f177ca7e9c645718d1dbe95bf3c6f60563f6e8";
	const older = "a0b6a75e1c0d3f4a5b6c7d8e9f0a1b2c3d4e5f60";

	it("says nothing when the baseline is the measured base", () => {
		expect(codeSizeBaselineDrift(base, base)).toBeUndefined();
	});

	it("says nothing when either commit is unknown", () => {
		// A `main` push has no base, and a baseline predating `meta.commit` has no
		// commit — neither is drift, so neither warns.
		expect(codeSizeBaselineDrift(base, undefined)).toBeUndefined();
		expect(codeSizeBaselineDrift(undefined, base)).toBeUndefined();
		expect(codeSizeBaselineDrift(undefined, undefined)).toBeUndefined();
	});

	it("names both commits when they differ", () => {
		const note = codeSizeBaselineDrift(older, base);
		expect(note).toContain("a0b6a75");
		expect(note).toContain("e3f177c");
		expect(note).toContain("[!WARNING]");
	});
});

describe("formatBytes", () => {
	it("keeps bytes exact and scales the rest", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(1023)).toBe("1023 B");
		expect(formatBytes(-2048)).toBe("-2.00 KiB");
		expect(formatBytes(1024 ** 3 * 2)).toBe("2.00 GiB");
	});
});

describe("compareMetrics", () => {
	it("states which side an entry is missing from", () => {
		const changes = compareMetrics(
			{ gone: metrics(10), same: metrics(10), moved: metrics(10) },
			{ same: metrics(10), moved: metrics(20), fresh: metrics(30) }
		);
		expect(
			Object.fromEntries(changes.map(({ name, status }) => [name, status]))
		).toEqual({ gone: "removed", moved: "changed", fresh: "added" });
	});
});

describe("compareRuntimes", () => {
	it("reports only the runtimes whose module set moved", () => {
		expect(
			compareRuntimes(
				{ kept: ["a", "b"], same: ["a"], dropped: ["a"] },
				{ kept: ["a", "c"], same: ["a"], fresh: ["a", "b"] }
			)
		).toEqual([
			// Most modules moved first, ties by name — `same` moved none at all.
			{
				name: "fresh",
				status: "added",
				before: 0,
				after: 2,
				added: ["a", "b"],
				removed: []
			},
			{
				name: "kept",
				status: "changed",
				before: 2,
				after: 2,
				added: ["c"],
				removed: ["b"]
			},
			{
				name: "dropped",
				status: "removed",
				before: 1,
				after: 0,
				added: [],
				removed: ["a"]
			}
		]);
	});
});

describe("splitDelta", () => {
	it("keeps the bytes a new entry brings apart from the ones that moved", () => {
		expect(
			splitDelta(
				{ kept: metrics(100), gone: metrics(50) },
				{ kept: metrics(120), fresh: metrics(900) },
				"raw"
			)
		).toEqual({ changed: 20, introduced: 850 });
	});
});

describe("formatMarkdown", () => {
	it("renders a pull request that adds a case", () => {
		expect(formatMarkdown(WITH_NEW_CASE, BASELINE)).toMatchSnapshot();
	});

	it("renders a run with no baseline to compare against", () => {
		expect(
			formatMarkdown(WITH_NEW_CASE, undefined, "No baseline report was found")
		).toMatchSnapshot();
	});

	it("renders a pull request that changes nothing", () => {
		expect(formatMarkdown(BASELINE, BASELINE)).toMatchSnapshot();
	});

	it("reports the assets it changed before the ones it adds", () => {
		const summary = formatMarkdown(WITH_NEW_CASE, BASELINE);
		const changedTable = summary.indexOf("asset(s) changed size");
		const addedTable = summary.indexOf("asset(s) this pull request adds");
		expect(changedTable).toBeGreaterThan(-1);
		expect(addedTable).toBeGreaterThan(changedTable);
		// The changed table is what the report exists for, so it is the one that
		// renders unfolded.
		expect(summary).toContain("<details open><summary>2 asset(s) changed size");
		expect(summary).toContain("<details><summary>2 asset(s) this pull request");
	});

	it("keeps a new case's bytes out of the raw change", () => {
		const summary = formatMarkdown(WITH_NEW_CASE, BASELINE);
		// The case adds 27000 bytes and shrinks two assets by 70 — one number would
		// report the shrink as a 26 KiB regression.
		expect(summary).toContain(
			"| Assets | 2 | 2 | 0 | 1 | 🟢 ↓ -70 B | +26.37 KiB |"
		);
		expect(summary).toContain(
			"**changes the size of 2 asset(s)** and adds 2 new asset(s)"
		);
	});

	it("gives every table its own row budget", () => {
		/** @type {Record<string, Metrics>} */
		const added = {};
		for (let i = 0; i < MAX_ROWS + 5; i++) {
			added[`bundle${i}.js`] = metrics(9000);
		}
		const summary = formatMarkdown(
			report("b".repeat(40), {
				"css/basic": caseResult({ "bundle0.js": metrics(4150) }),
				"asset-modules/basic": caseResult({ "bundle0.js": metrics(12000) }),
				"my-feature/case": caseResult(added)
			}),
			report("a".repeat(40), {
				"css/basic": caseResult({ "bundle0.js": metrics(4200) }),
				"asset-modules/basic": caseResult({ "bundle0.js": metrics(12000) })
			})
		);
		// Every new asset outweighs the one that changed, so a shared budget would
		// leave the changed one out of the report entirely.
		expect(summary).toContain("`css/basic bundle0.js`");
		expect(summary).toContain("… 5 more, see the uploaded report");
	});

	it("says so when a case stopped emitting", () => {
		const stopped = report("b".repeat(40), {
			"css/basic": {
				metrics: metrics(0),
				assets: {},
				runtimes: {},
				errors: 1,
				noOutput: "build: 1 error(s), nothing emitted"
			},
			"asset-modules/basic": caseResult({ "bundle0.js": metrics(12000) })
		});
		const summary = formatMarkdown(stopped, BASELINE);
		expect(summary).toContain("[!NOTE]");
		expect(summary).toContain("`css/basic`");
		expect(summary).toContain("asset(s) this pull request no longer emits");
	});
});
