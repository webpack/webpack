"use strict";

const cp = require("child_process");
const examples = require("./examples");

const commands = examples
	.concat(
		examples.filter(dirname => dirname.includes("persistent-caching"))
	)
	.map(function(dirname) {
		return "cd " + dirname + " && node build.js";
	});

let failed = 0;
let i = 0;
for(const cmd of commands) {
	console.log(`[${++i}/${commands.length}] ${cmd}`);
	try {
		cp.execSync(cmd, { encoding: "utf-8" });
	} catch(e) {
		failed++;
		console.log(e);
	}
}
console.log("done");
if(failed > 0)
	console.log(`${failed} failed`);
