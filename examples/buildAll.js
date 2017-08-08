"use strict";

const cp = require("child_process");
const examples = require("./examples");

const cmds = examples.map(function(dirname) {
	return "cd " + dirname + " && node build.js";
});

let i = 0;
for(const cmd of cmds) {
	console.log(`[${++i}/${cmds.length}] ${cmd}`);
	cp.execSync(cmd, { encoding: "utf-8" });
}
console.log("done");
