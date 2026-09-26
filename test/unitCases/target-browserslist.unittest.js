"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const { load, resolve } = require("../../lib/config/browserslistTargetHandler");

describe("browserslist target", () => {
	const tests = [
		// IE
		["ie 11"],
		["ie_mob 11"],

		// Edge
		["edge 79"],

		// Android
		["android 4"],
		["android 4.1"],
		["android 4.4.3-4.4.4"],
		["android 81"],

		// Chrome
		// Browserslist return `chrome` versions for `electron 11.0` query
		["chrome 80"],
		["and_chr 80"],

		// Firefox
		["firefox 68"],
		["and_ff 68"],

		// Opera
		["opera 54"],
		["op_mob 54"],

		// Safari
		// Browserslist return `safari` versions for `phantomjs 2.1` query
		["safari 10"],
		["safari TP"],
		["safari 11"],
		["safari 12.0"],
		["safari 12.1"],
		["safari 13"],
		["ios_saf 12.0-12.1"],

		// Samsung
		["samsung 4"],
		["samsung 9.2"],
		["samsung 11.1-11.2"],

		// Opera mini
		["op_mini all"],

		// BlackBerry
		["bb 10"],

		// Node
		["node 0.10.0"],
		["node 0.12.0"],
		["node 10.0.0"],
		["node 10.17.0"],
		["node 12.19.0"],
		["node 13.12.0"],
		["node 24.7.0"],

		// QQ browser
		["and_qq 10.4"],

		// Kaios
		["kaios 2.5"],

		// Baidu
		["baidu 7.12"],

		// Multiple
		["firefox 80", "chrome 80"],
		["chrome 80", "node 12.19.0"],
		["chrome 80", "node 13.12.0"],

		// defaults and fully supports es6-module
		// maintained node versions
		[
			"and_chr 140",
			"and_ff 142",
			"and_qq 14.9",
			"and_uc 15.5",
			"android 140",
			"chrome 140",
			"chrome 139",
			"chrome 138",
			"chrome 137",
			"chrome 112",
			"chrome 109",
			"chrome 105",
			"edge 140",
			"edge 139",
			"edge 138",
			"firefox 143",
			"firefox 142",
			"firefox 141",
			"firefox 140",
			"ios_saf 26.0",
			"ios_saf 18.5-18.6",
			"kaios 3.0-3.1",
			"node 24.8.0",
			"node 22.19.0",
			"node 20.19.0",
			"op_mob 80",
			"opera 122",
			"opera 121",
			"opera 120",
			"safari 26.0",
			"safari 18.5-18.6",
			"samsung 28",
			"samsung 27"
		],

		// Unknown
		["unknown 50"]
	];

	for (const test of tests) {
		it(`${JSON.stringify(test)}`, () => {
			expect(resolve(test)).toMatchSnapshot();
		});
	}

	// A browser listed at a bare major version (no minor component, e.g.
	// `safari 10`, which browserslist emits) must be treated as `<major>.0`, so
	// it matches a feature whose first supported version is given as a
	// `[major, minor]` pair. Otherwise the missing minor coerces to `NaN` and
	// the equal-major comparison wrongly reports the feature as unsupported.
	describe("bare major version equals `<major>.0`", () => {
		it("resolves `safari 10` the same as `safari 10.0`", () => {
			expect(resolve(["safari 10"])).toEqual(resolve(["safari 10.0"]));
		});

		it("supports `const`/`let` at the exact required major", () => {
			const result = resolve(["safari 10"]);
			expect(result.const).toBe(true);
			expect(result.let).toBe(true);
		});

		it("still rejects a major below the required one", () => {
			expect(resolve(["safari 9"]).const).toBe(false);
		});
	});

	describe("load", () => {
		const context = path.join(
			__dirname,
			"..",
			"configCases",
			"css",
			"minimize-vendor-prefixes"
		);

		it("reads the config once for a target, and hands the same list back", () => {
			const first = load(null, context);
			expect(first).toEqual(["chrome 40", "firefox 40", "safari 17.0"]);
			// The same list, not an equal one — the minifier reads the identity to
			// skip re-parsing a selection it has already seen.
			expect(load(null, context)).toBe(first);
		});

		it("keeps a query apart from the config it sits beside", () => {
			expect(load("last 1 chrome version", context)).not.toBe(
				load(null, context)
			);
		});
	});

	describe("the default target", () => {
		const withoutConfig = path.resolve(__dirname, "../fixtures");
		const withConfig = path.resolve(__dirname, "../fixtures/browserslist");

		// What a browserslist query reads, asked for by request rather than by
		// path, so `require.cache` is read with the key Node itself wrote
		const QUERY_DATA = [
			"browserslist",
			"caniuse-lite/dist/unpacker/agents",
			"electron-to-chromium/versions",
			"node-releases/data/processed/envs.json",
			"baseline-browser-mapping"
		];

		/**
		 * The environment without the browserslist variables, which decide a
		 * config of their own and would otherwise reach the child.
		 * @returns {NodeJS.ProcessEnv} the environment to run a child in
		 */
		const environmentWithoutBrowserslist = () => {
			/** @type {NodeJS.ProcessEnv} */
			const environment = {};
			for (const [name, value] of Object.entries(process.env)) {
				if (!name.startsWith("BROWSERSLIST")) environment[name] = value;
			}
			return environment;
		};

		/**
		 * Resolves the default target in a fresh process, reporting which of the
		 * things a query reads were loaded to answer it.
		 * @param {string} context the context directory
		 * @returns {{ target: string, queryData: string[] }} what it answered
		 */
		const resolveInChildProcess = (context) => {
			const script = `
				const { getDefaultTarget } = require(${JSON.stringify(
					require.resolve("../../lib/config/target")
				)});
				const target = getDefaultTarget(${JSON.stringify(context)});
				const queryData = ${JSON.stringify(QUERY_DATA)}.filter((request) => {
					try {
						return require.cache[require.resolve(request)] !== undefined;
					} catch (_err) {
						return false;
					}
				});
				process.stdout.write(JSON.stringify({ target, queryData }));
			`;
			return JSON.parse(
				execFileSync(process.execPath, ["-e", script], {
					encoding: "utf8",
					env: environmentWithoutBrowserslist()
				})
			);
		};

		it("reads no query data where no browserslist config exists", () => {
			const { target, queryData } = resolveInChildProcess(withoutConfig);
			expect(target).toBe("web");
			expect(queryData).toEqual([]);
		});

		it("answers browserslist where a config exists", () => {
			const { target, queryData } = resolveInChildProcess(withConfig);
			expect(target).toBe("browserslist");
			// A config means the queries do run, so the data is read after all
			expect(queryData).toEqual(QUERY_DATA);
		});
	});
});
