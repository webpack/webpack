"use strict";

const fs = require("fs");
const path = require("path");

// A long chain of side-effect-free modules, each importing the next and using the
// binding in its own export. `getModuleEvaluationSideEffectsState` used to recurse
// and overflow V8's stack (#20986); the 20000-deep case is in the unit test.
const N = 500;
const chainDir = path.join(__dirname, "src", "chain");
if (!fs.existsSync(chainDir)) {
	fs.mkdirSync(chainDir, { recursive: true });
	fs.writeFileSync(
		path.join(chainDir, `mod-${N}.js`),
		`export const value = [${N}];\nexport const config = { id: ${N} };\n`
	);
	for (let i = N - 1; i >= 0; i--) {
		fs.writeFileSync(
			path.join(chainDir, `mod-${i}.js`),
			`import { value as imported } from "./mod-${i + 1}.js";
export const value = [imported, ${i}];
export const config = { id: ${i} };
`
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	}
};
