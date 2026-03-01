import fs from "node:fs";
import path from "node:path";
import { Bench } from "tinybench";

import oxcParse from "./oxc-parse.js";
import meriyahParse from "./meriyah-parse.js";
import acornParse from "./acorn-parse.js";

const options = {
	sourceType: "module",
	ecmaVersion: "latest",
	ranges: true,
	locations: true,
	comments: true,
	allowHashBang: true,
	allowReturnOutsideFunction: false,
	semicolons: true
};

const bench = new Bench({ name: "simple benchmark", time: 100 });

const sourceCode = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../node_modules/three/build/three.module.js"
	),
	"utf8"
);

bench
	.add("oxc", () => {
		oxcParse(sourceCode, options);
	})
	.add("meriyah", () => {
		meriyahParse(sourceCode, options);
	})
	.add("acorn", () => {
		acornParse(sourceCode, options);
	});

await bench.run();

console.log(bench.name);
console.table(bench.table());
