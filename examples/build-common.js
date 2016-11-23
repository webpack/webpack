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
(function doIt(remainingTimes) {
	cp.exec("node ../../bin/webpack.js" + displayReasons + " --display-chunks --display-modules --display-origins --display-entrypoints --output-public-path \"js/\" -p " + extraArgs + targetArgs, function (error, stdout, stderr) {
		if(stderr && remainingTimes === 1)
			console.log(stderr);
		if (error !== null && remainingTimes === 1)
			console.log(error);
		try {
			var readme = tc(fs.readFileSync(require("path").join(process.cwd(), "template.md"), "utf-8"), process.cwd(), stdout.replace(/[\r\n]*$/, ""), "min");
		} catch(e) {
			console.log(stderr);
			throw e;
		}
		cp.exec("node ../../bin/webpack.js" + displayReasons + " --display-chunks --display-modules --display-origins --display-entrypoints --output-public-path \"js/\" --output-pathinfo " + extraArgs + targetArgs, function (error, stdout, stderr) {
			if(remainingTimes === 1)
				console.log(stdout);
			if(stderr && remainingTimes === 1)
				console.log(stderr);
			if (error !== null && remainingTimes === 1)
				console.log(error);
			readme = tc(readme, process.cwd(), stdout.replace(/[\r\n]*$/, ""));
			readme = readme.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
			fs.writeFile("README.md", readme, "utf-8", function() {});
			if(remainingTimes > 1)
				doIt(remainingTimes - 1);
		});
	});
}(3));
