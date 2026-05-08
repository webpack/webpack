"use strict";

/** @type {import("jest").Config} */
const config = {
	testTimeout: 30000,
	prettierPath: require.resolve("prettier-2"),
	forceExit: true,
	setupFilesAfterEnv: ["<rootDir>/test/setupTestFramework.js"],
	testMatch: [
		"<rootDir>/test/*.test.js",
		"<rootDir>/test/*.basictest.js",
		"<rootDir>/test/*.longtest.js",
		"<rootDir>/test/*.unittest.js",
		"<rootDir>/test/*.spectest.js"
	],
	watchPathIgnorePatterns: [
		"<rootDir>/.git",
		"<rootDir>/node_modules",
		"<rootDir>/test/js",
		"<rootDir>/test/browsertest/js",
		"<rootDir>/test/fixtures/temp-cache-fixture",
		"<rootDir>/test/fixtures/temp-",
		"<rootDir>/benchmark",
		"<rootDir>/assembly",
		"<rootDir>/tooling",
		"<rootDir>/examples/*/dist",
		"<rootDir>/coverage",
		"<rootDir>/.eslintcache"
	],
	modulePathIgnorePatterns: [
		"<rootDir>/.git",
		"<rootDir>/node_modules/webpack/node_modules",
		"<rootDir>/test/js",
		"<rootDir>/test/browsertest/js",
		"<rootDir>/test/fixtures/temp-cache-fixture",
		"<rootDir>/test/fixtures/temp-",
		"<rootDir>/benchmark",
		"<rootDir>/examples/*/dist",
		"<rootDir>/coverage",
		"<rootDir>/.eslintcache"
	],
	transformIgnorePatterns: ["<rootDir>"],
	coverageDirectory: "<rootDir>/coverage",
	coveragePathIgnorePatterns: [
		"\\.runtime\\.js$",
		"<rootDir>/test",
		"<rootDir>/schemas",
		"<rootDir>/examples",
		"<rootDir>/node_modules"
	],
	testEnvironment: "./test/harness/patch-node-env.js",
	testEnvironmentOptions: {
		// Mirror Node.js's default condition set so package.json "exports"
		// resolves identically to real Node.js (jest-environment-node defaults
		// to ["node", "node-addons"], which drops "module-sync").
		customExportConditions: ["node", "node-addons", "module-sync"]
	},
	snapshotResolver: "./test/harness/snapshot/resolver.js",
	coverageReporters: ["json"],
	snapshotFormat: {
		escapeString: true,
		printBasicPrototype: true
	}
};

module.exports = config;
