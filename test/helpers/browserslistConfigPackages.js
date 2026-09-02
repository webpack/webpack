/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const fs = require("fs");
const path = require("path");

// `browserslist` resolves `extends browserslist-config-*` from its own
// directory, so these packages have to sit in the repository's `node_modules`.
const NODE_MODULES_PATH = path.resolve(__dirname, "../../node_modules");
// The test env is what `configCases/ecmaVersion/browserslist-*extends` build in.
const DEVELOPMENT_AND_TEST = `
module.exports = {
  development: [
    'last 1 version'
  ],
  test: [
    'ie 9',
  ]
}
`;
const DEVELOPMENT_AND_PRODUCTION = `
module.exports = {
  development: [
    'last 1 version'
  ],
  production: [
    'ie 9',
  ]
}
`;
const PACKAGES = new Map([
	["browserslist-config-mycompany", DEVELOPMENT_AND_PRODUCTION],
	["browserslist-config-mycompany1", DEVELOPMENT_AND_TEST],
	["browserslist-config-mycompany2", DEVELOPMENT_AND_TEST]
]);

/**
 * Writes the packages the `configCases/ecmaVersion` browserslist cases extend.
 * They live for the whole run: removing one while another worker builds leaves
 * that worker resolving a build dependency that is gone, invalidating its pack.
 * @returns {void}
 */
const create = () => {
	for (const [name, content] of PACKAGES) {
		const packagePath = path.resolve(NODE_MODULES_PATH, name);

		fs.mkdirSync(packagePath, { recursive: true });
		fs.writeFileSync(path.resolve(packagePath, "index.js"), content);
		// A managed path without a `package.json` is not snapshotted as one.
		fs.writeFileSync(
			path.resolve(packagePath, "package.json"),
			`${JSON.stringify({ name, version: "1.0.0", main: "index.js" }, null, 2)}\n`
		);
	}
};

/**
 * Removes those packages again, once every test file has run.
 * @returns {void}
 */
const remove = () => {
	for (const name of PACKAGES.keys()) {
		const packagePath = path.resolve(NODE_MODULES_PATH, name);

		// Not `fs.rmSync`: the harness itself runs on the Node.js 10 CI matrix.
		for (const file of ["index.js", "package.json"]) {
			try {
				fs.unlinkSync(path.resolve(packagePath, file));
			} catch (_err) {
				// Already gone
			}
		}

		try {
			fs.rmdirSync(packagePath);
		} catch (_err) {
			// Already gone
		}
	}
};

module.exports = { create, remove };
