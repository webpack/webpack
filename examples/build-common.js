/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var cp = require('child_process');
var tc = require("./template-common");
var Stats = require("../lib/Stats");
// var webpackGraph = require("webpack-graph");
var fs = require("fs");
var path = require("path");

var extraArgs = "";

var targetArgs = global.NO_TARGET_ARGS?"":" ./example.js js/output.js"
cp.exec("node ../../bin/webpack.js --display-reasons --display-chunks -p "+extraArgs+targetArgs, function (error, stdout, stderr) {
	if(stderr)
		console.log(stderr);
	if (error !== null)
		console.log(error);
	var readme = tc(fs.readFileSync(require("path").join(process.cwd(), "template.md"), "utf-8"), process.cwd(), stdout.replace(/[\r\n]*$/, ""), "min");
	cp.exec("node ../../bin/webpack.js --display-reasons --display-chunks --optimize-occurence-order --output-pathinfo "+extraArgs+targetArgs, function (error, stdout, stderr) {
		console.log(stdout);
		if(stderr)
			console.log(stderr);
		if (error !== null)
			console.log(error);
		// var stats = JSON.parse(stdout);
		// var formatedStats = Stats.jsonToString(stats, {
			// context: process.cwd(),
			// verbose: true
		// });
		// var filenameShortener = createFilenameShortener(process.cwd());
		readme = tc(readme, process.cwd(), stdout.replace(/[\r\n]*$/, ""));
		readme = readme.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		fs.writeFile("README.md", readme, "utf-8", function() {});
		// fs.writeFile("graph.svg", webpackGraph(stats, {
			// nameShortener: filenameShortener,
			// width: 500,
			// height: 300
		// }), "utf-8", function() {});
	});
});
