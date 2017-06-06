/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var cp = require("child_process");
var tc = require("./template-common");
var fs = require("fs");

var extraArgs = "";

var targetArgs = global.NO_TARGET_ARGS ? "" : " ./example.js js/output.js";
var displayReasons = global.NO_REASONS ? "" : " --display-reasons --display-used-exports --display-provided-exports";
cp.exec("node ../../bin/webpack.js" + displayReasons + " --display-chunks --display-modules --display-origins --display-entrypoints --output-public-path \"js/\" -p " + extraArgs + targetArgs, function(error, stdout, stderr) {
	if(stderr)
		console.log(stderr);
	if(error !== null)
		console.log(error);
	try {
		var readme = tc.replaceResults(fs.readFileSync(require("path").join(process.cwd(), "template.md"), "utf-8"), process.cwd(), stdout.replace(/[\r\n]*$/, ""), "min");
	} catch(e) {
		console.log(stderr);
		throw e;
	}
	cp.exec("node ../../bin/webpack.js" + displayReasons + " --display-chunks --display-modules --display-origins --display-entrypoints --output-public-path \"js/\" --output-pathinfo " + extraArgs + targetArgs, function(error, stdout, stderr) {
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
