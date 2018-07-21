/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const cp = require("child_process");
const path = require("path");
const tc = require("./template-common");
const fs = require("fs");

const extraArgs = "";

const targetArgs = global.NO_TARGET_ARGS ? "" : " ./example.js js/output.js";
const displayReasons = global.NO_REASONS ? "" : " --display-reasons --display-used-exports --display-provided-exports";
cp.exec(`node ${path.resolve(__dirname, "../bin/webpack.js")} ${displayReasons} --display-chunks --display-max-modules 99999 --display-origins --display-entrypoints --output-public-path "js/" -p ${extraArgs} ${targetArgs}`, function(error, stdout, stderr) {
	if(stderr)
		console.log(stderr);
	if(error !== null)
		console.log(error);
	let readme;
	try {
		readme = tc.replaceResults(fs.readFileSync(require("path").join(process.cwd(), "template.md"), "utf-8"), process.cwd(), stdout.replace(/[\r\n]*$/, ""), "min");
	} catch(e) {
		console.log(stderr);
		throw e;
	}
	cp.exec(`node ${path.resolve(__dirname, "../bin/webpack.js")} ${displayReasons} --display-chunks --display-max-modules 99999 --display-origins --display-entrypoints --output-public-path "js/" --output-pathinfo ${extraArgs} ${targetArgs}`, function(error, stdout, stderr) {
		console.log(stdout);
		if(stderr)
			console.log(stderr);
		if(error !== null)
			console.log(error);
		readme = tc.replaceResults(readme, process.cwd(), stdout.replace(/[\r\n]*$/, ""));
		readme = tc.replaceBase(readme);
		fs.writeFile("README.md", readme, "utf-8", function() {});
	});
});
