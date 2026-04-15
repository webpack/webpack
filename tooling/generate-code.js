"use strict";

const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

// When --write is set, files will be written in place
// Otherwise it only prints outdated files
const doWrite = process.argv.includes("--write");

const files = new Map([
	// TODO remove this in the next major release and use `eslint-scope` directly
	[
		"./node_modules/eslint-scope/dist/eslint-scope.cjs",
		"./lib/util/eslint-scope.compat.js"
	]
]);

(async () => {
	for (const [s, d] of files) {
		const src = path.resolve(__dirname, "..", s);
		const dest = path.resolve(__dirname, "..", d);
		const code = fs.readFileSync(src, "utf8");

		const result = await babel.transformAsync(code, {
			presets: [
				[
					"@babel/preset-env",
					{
						targets: {
							node: "10.13.0"
						}
					}
				]
			],
			filename: src
		});

		if (!result) {
			console.error("babel didn't generate new code");
			process.exitCode = 1;
			return;
		}

		let newCode = result.code;

		if (!newCode) {
			console.error("new code wasn't generated");
			process.exitCode = 1;
			return;
		}

		newCode = `// @ts-nocheck\n${newCode}`;

		if (newCode !== code) {
			if (doWrite) {
				fs.writeFileSync(dest, newCode, "utf8");
				console.error(`${dest} updated`);
			} else {
				console.error(`${dest} need to be updated`);
				process.exitCode = 1;
			}
		}
	}
})();
