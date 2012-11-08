/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
require = require("enhanced-require")(module);

var cp = require('child_process');
var tc = require("./template-common");
var formatOutput = require("../lib/formatOutput");
var createFilenameShortener = require("../lib/createFilenameShortener");
var webpackGraph = require("webpack-graph");
var fs = require("fs");

var extraArgs = "";
if(fs.existsSync(require("path").join(process.cwd(), "webpackOptions.js")))
	extraArgs += "--options webpackOptions.js ";

cp.exec("node ../../bin/webpack.js --verbose --min "+extraArgs+" example.js js/output.js", function (error, stdout, stderr) {
	if(stderr)
		console.log(stderr);
	if (error !== null)
		console.log(error);
	var readme = tc(require("raw!"+require("path").join(process.cwd(), "template.md")), require.context("raw!"+process.cwd()), stdout.replace(/[\r\n]*$/, ""), "min");
	cp.exec("node ../../bin/webpack.js --filenames --verbose "+extraArgs+" example.js js/output.js --json", function (error, stdout, stderr) {
		clean(require.contentCache);
		clean(require.sourceCache);
		clean(require.cache);
		if(stderr)
			console.log(stderr);
		if (error !== null)
			console.log(error);
		var stats = JSON.parse(stdout);
		var formatedStats = formatOutput(stats, {
			context: process.cwd(),
			verbose: true
		});
		var filenameShortener = createFilenameShortener(process.cwd());
		readme = tc(readme, require.context("raw!"+process.cwd()), formatedStats.replace(/[\r\n]*$/, ""));
		readme = readme.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		fs.writeFile("README.md", readme, "utf-8", function() {});
		fs.writeFile("graph.svg", webpackGraph(stats, {
			nameShortener: filenameShortener,
			width: 500,
			height: 300
		}), "utf-8", function() {});
	});
});

function clean(obj) {
	for(var name in obj) {
		delete obj[name];
	}
}