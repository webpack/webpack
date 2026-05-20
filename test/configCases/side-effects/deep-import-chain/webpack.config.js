"use strict";

const fs = require("fs");
const path = require("path");

// Mirrors the reproduction from
// https://github.com/abecirovic-mo/webpack-5.107.0-repro: a long chain of
// side-effect-free modules where each imports the next and uses the
// imported binding in its own export. The SideEffectsFlagPlugin walks the
// chain via `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState`,
// which used to recurse and overflow V8's stack on 5.107.0 (issue #20986).
// The chain here is linear (mod-N is terminal) — that's enough to exercise
// the same recursive path. The unit test in `test/NormalModule.unittest.js`
// covers a 20000-deep chain to assert the algorithm is stack-safe
// regardless of size.
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
