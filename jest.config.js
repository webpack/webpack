"use strict";

/** @import { Config } from "jest" */

// coverage instrumentation slows every build; test/helpers/testTimeout.js
// reads this as a global, not from the environment the builds can expose
const coverage = process.argv.some((arg) =>
	/^--(coverage|collectCoverage|collect-coverage)(=true)?$/.test(arg)
);

/** @type {Config} */
const config = {
	testTimeout: coverage ? 90000 : 30000,
	globals: { __WEBPACK_TEST_COVERAGE__: coverage },
	prettierPath: require.resolve("prettier-2"),
	globalSetup: "<rootDir>/test/harness/globalSetup.js",
	globalTeardown: "<rootDir>/test/harness/globalTeardown.js",
	setupFiles: [
		"<rootDir>/test/harness/runtimes/bun-sandbox-setup.js",
		"<rootDir>/test/harness/runtimes/deno-worker-setup.js"
	],
	setupFilesAfterEnv: ["<rootDir>/test/harness/setupTestFramework.js"],
	testMatch: [
		"<rootDir>/test/*.test.js",
		"<rootDir>/test/*.basictest.js",
		"<rootDir>/test/*.longtest.js",
		"<rootDir>/test/unitCases/**/*.unittest.js",
		"<rootDir>/test/specCases/*.spectest.js"
	],
	watchPathIgnorePatterns: [
		"<rootDir>/.git",
		"<rootDir>/node_modules",
		"<rootDir>/test/external/wpt",
		"<rootDir>/test/external/swc",
		"<rootDir>/test/external/oxc",
		"<rootDir>/test/js",
		"<rootDir>/test/fixtures/temp-cache-fixture",
		"<rootDir>/test/fixtures/temp-",
		"<rootDir>/assembly",
		"<rootDir>/tooling",
		"<rootDir>/examples/*/dist",
		"<rootDir>/coverage",
		"<rootDir>/.eslintcache"
	],
	modulePathIgnorePatterns: [
		"<rootDir>/.git",
		"<rootDir>/test/external/wpt",
		"<rootDir>/test/external/swc",
		"<rootDir>/test/external/oxc",
		"<rootDir>/node_modules/webpack/node_modules",
		"<rootDir>/test/js",
		"<rootDir>/test/fixtures/temp-cache-fixture",
		"<rootDir>/test/fixtures/temp-",
		"<rootDir>/examples/*/dist",
		"<rootDir>/coverage",
		"<rootDir>/.eslintcache"
	],
	transformIgnorePatterns: ["<rootDir>"],
	coverageDirectory: "<rootDir>/coverage",
	coveragePathIgnorePatterns: [
		"\\.runtime\\.js$",
		// Serialized to the minimizer's worker pool as source (like runtime code):
		// coverage instrumentation would inject counters the worker can't resolve.
		"[\\\\/]lib[\\\\/](?:css[\\\\/]cssMinify|html[\\\\/](?:htmlMinify|xmlMinify)|javascript[\\\\/]jsMinify|json[\\\\/]jsonMinify)\\.js$",
		"<rootDir>/test",
		"<rootDir>/schemas",
		"<rootDir>/examples",
		"<rootDir>/node_modules"
	],
	testEnvironment: "./test/harness/patch-node-env.js",
	snapshotResolver: "./test/harness/snapshot/resolver.js",
	coverageReporters: ["json"],
	snapshotFormat: {
		escapeString: true,
		printBasicPrototype: true
	}
};

// `--parts=<n>` runs every matched file in n parallel workers at once, each
// told its part through `test/helpers/testParts.js`; setup runs once.
// `--parts=auto` takes one part per core, but no more than the memory feeds.
const partsArg = process.argv.find((arg) => arg.startsWith("--parts="));
const partsValue = partsArg ? partsArg.slice("--parts=".length) : "1";

// What one part of test262 takes at its peak: 1.6 GB of heap, plus coverage
// and the code outside the heap. More parts than this fits swap, then die.
const PART_MEMORY = 3.5 * 1024 ** 3;

/**
 * Counts the parts `--parts=auto` runs on this machine: one per core, as long
 * as the memory, a container's limit included, holds `PART_MEMORY` per part.
 * @returns {number} how many parts to run at once
 */
const autoParts = () => {
	const os = require("os");

	const cores = os.cpus().length;
	let memory = os.totalmem();
	const limit =
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		typeof process.constrainedMemory === "function"
			? // eslint-disable-next-line n/no-unsupported-features/node-builtins
				process.constrainedMemory()
			: 0;
	if (limit > 0 && limit < memory) memory = limit;
	const count = Math.max(1, Math.min(cores, Math.floor(memory / PART_MEMORY)));
	process.stderr.write(
		`--parts=auto: ${count} parts for ${cores} cores and ${(memory / 1024 ** 3).toFixed(1)} GiB\n`
	);
	return count;
};

const parts = partsValue === "auto" ? autoParts() : Number(partsValue);
// Jest reads these only from the top level and warns when a project sets them.
const { coverageReporters, ...projectConfig } = config;

module.exports =
	parts > 1
		? {
				// global options (coverage) are read from the top level
				...config,
				projects: Array.from({ length: parts }, (_, index) => ({
					...projectConfig,
					rootDir: __dirname,
					displayName: `part ${index + 1}/${parts}`,
					globals: { ...config.globals, __TEST_PART__: [index + 1, parts] },
					...(index > 0 && {
						globalSetup: undefined,
						globalTeardown: undefined
					})
				}))
			}
		: config;
