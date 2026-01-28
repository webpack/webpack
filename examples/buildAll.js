"use strict";

const cp = require("child_process");
const examples = require("./examples");

const commands = [
	...examples,
	examples.filter((dirname) => dirname.includes("persistent-caching"))
].map((dirname) => `cd ${dirname} && node build.js`);

let failed = 0;
let i = 0;

for (const cmd of commands) {
	console.log(`[${++i}/${commands.length}] ${cmd}`);

	try {
		cp.execSync(cmd, { encoding: "utf8" });
	} catch (err) {
		failed++;
		console.log(err);
	}
}

console.log("done");

if (failed > 0) {
	throw new Error(`${failed} examples failed`);
}
