const base = {
	watchPathIgnorePatterns: [
		"<rootDir>/.git",
		"<rootDir>/node_modules",
		"<rootDir>/test/js",
		"<rootDir>/test/browsertest/js",
		"<rootDir>/test/fixtures",
		"<rootDir>/benchmark",
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
	transformIgnorePatterns: ["<rootDir>"]
};

module.exports = {
	reporters: ["<rootDir>/tooling/DotReporter.js"],
	projects: [
		Object.assign({}, base, {
			runner: "jest-runner-eslint",
			displayName: "eslint",
			testMatch: [
				"<rootDir>/*.js",
				"<rootDir>/setup/**/*.js",
				"<rootDir>/lib/**/*.js",
				"<rootDir>/bin/**/*.js",
				"<rootDir>/hot/**/*.js",
				"<rootDir>/buildin/**/*.js",
				"<rootDir>/benchmark/**/*.js",
				"<rootDir>/tooling/**/*.js",
				"<rootDir>/test/*.js",
				"<rootDir>/test/**/webpack.config.js",
				"<rootDir>/examples/**/webpack.config.js",
				"<rootDir>/schemas/**/*.js"
			]
		}),
		Object.assign({}, base, {
			displayName: "lint",
			testMatch: ["<rootDir>/test/*.lint.js"]
		})
	]
};
