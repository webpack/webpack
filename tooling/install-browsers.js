/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

// Downloads the Chrome, Firefox and WebKit the browser suites compare against,
// into playwright's own cache rather than into webpack's dependencies. Each is
// the build playwright-core pins, so an engine moves only when the lockfile
// does and a Dependabot bump of playwright-core is the one pull request that
// sees a new engine. Safe to re-run: a build that is already there is not
// fetched again. `node tooling/install-browsers.js firefox` fetches one, and
// `--with-deps` also installs the system libraries the engine needs.

const { execFileSync } = require("child_process");
const path = require("path");

// playwright's names for them: its `chromium` is Chrome for Testing
const ENGINES = { chrome: "chromium", firefox: "firefox", webkit: "webkit" };

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith("--"));
const wanted = args.filter((arg) => !arg.startsWith("--"));
for (const engine of wanted) {
	if (!(engine in ENGINES)) {
		throw new Error(
			`no pinned build for ${engine}: ${Object.keys(ENGINES).join(", ")}`
		);
	}
}

execFileSync(
	process.execPath,
	[
		// not among the package's exports, so found beside its manifest
		path.join(
			path.dirname(require.resolve("playwright-core/package.json")),
			"cli.js"
		),
		"install",
		// the suites run Chrome in the full browser's headless mode, so the
		// separate headless shell is never launched
		"--no-shell",
		...flags,
		...(wanted.length > 0 ? wanted : Object.keys(ENGINES)).map(
			(engine) => ENGINES[/** @type {keyof typeof ENGINES} */ (engine)]
		)
	],
	{ stdio: "inherit" }
);
