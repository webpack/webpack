"use strict";

const cp = require("child_process");
const path = require("path");

const fixtures = [
	"module-sync-only",
	"module-sync-first",
	"import-require-first"
];

// Run real Node.js in a child process to capture how it resolves each fixture
// via require() and dynamic import(). Jest's runtime resolves package "exports"
// with a condition set that does not include "module-sync", so an in-process
// reference would not match real Node.js behavior. cwd is the fixture
// directory so bare-specifier import() resolves against its node_modules using
// Node.js's ESM resolver — that activates the "import" condition rather than
// "require".
const out = cp.execFileSync(
	process.execPath,
	[
		"-e",
		`
		"use strict";
		const Module = require("module");
		const r = Module.createRequire(${JSON.stringify(
			path.join(__dirname, "index.js")
		)});
		const fixtures = ${JSON.stringify(fixtures)};
		const requireResults = {};
		for (const name of fixtures) requireResults[name] = r(name);
		Promise.all(
			fixtures.map((name) =>
				import(name).then((mod) => [name, mod.default])
			)
		).then((entries) => {
			process.stdout.write(JSON.stringify({
				require: requireResults,
				import: Object.fromEntries(entries)
			}));
		});
		`
	],
	{
		cwd: __dirname,
		stdio: ["ignore", "pipe", "inherit"],
		encoding: "utf8"
	}
);
const nodeResults = JSON.parse(out);

module.exports = {
	findBundle(_, options) {
		const ext = path.extname(options.output.filename);
		return `./bundle${ext}`;
	},
	moduleScope(scope) {
		scope.nodeRequireResults = nodeResults.require;
		scope.nodeImportResults = nodeResults.import;
	}
};
