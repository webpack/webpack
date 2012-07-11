/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
require = require("../require-polyfill")(require.valueOf());

var cp = require('child_process');
var tc = require("./template-common");

var argv = process.argv;
argv.shift();
argv.shift();
var extraArgs = argv.join(" ");

cp.exec("node ../../bin/webpack.js --verbose --min "+extraArgs+" example.js js/output.js", function (error, stdout, stderr) {
	if(stderr)
		console.log(stderr);
	if (error !== null)
		console.log(error);
	var readme = tc(require("raw!"+require("path").join(process.cwd(), "template.md")), require.context("raw!"+process.cwd()), stdout.replace(/[\r\n]*$/, ""), "min");
	cp.exec("node ../../bin/webpack.js --filenames --verbose "+extraArgs+" example.js js/output.js", function (error, stdout, stderr) {
		if(stderr)
			console.log(stderr);
		if (error !== null)
			console.log(error);
		readme = tc(readme, require.context("raw!val!raw!"+process.cwd()), stdout.replace(/[\r\n]*$/, ""));
		readme = readme.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		require("fs").writeFile("README.md", readme, "utf-8", function() {});
	});
});
