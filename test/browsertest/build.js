/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var cp = require('child_process');

var argv = process.argv;
argv.shift();
argv.shift();
var extraArgs = argv;

function bindOutput(p) {
	p.stdout.on("data", function(data) {
		process.stdout.write(data);
	});
	p.stderr.on("data", function(data) {
		process.stderr.write(data);
	});
}
function join(a, b) {
	a = a.slice(0);
	Array.prototype.push.apply(a, b);
	return a;
}

console.log("compile scripts...");

var extraArgsNoWatch = extraArgs.slice(0);
var watchIndex = extraArgsNoWatch.indexOf("--watch");
if(watchIndex != -1) extraArgsNoWatch.splice(watchIndex, 1);
// node ../../bin/webpack --colors --single --library library1 node_modules/library1 js/library1.js
var library1 = cp.spawn("node", join(["../../bin/webpack.js", "--colors", "--single", "--library", "library1",
										"node_modules/library1", "js/library1.js"], extraArgsNoWatch));
bindOutput(library1);
library1.on("exit", function(code) {
	if(code === 0) {
		// node ../../bin/webpack --colors --alias vm=vm-browserify --workers --public-prefix js/ lib/index js/web.js
		var main = cp.spawn("node", join(["../../bin/webpack.js", "--colors", "--alias", "vm=vm-browserify", "--workers",
											"--public-prefix", "js/", "lib/index", "js/web.js"], extraArgs));
		bindOutput(main);
	}
});
var library2 = cp.spawn("node", join(["../../bin/webpack.js", "--colors", "--library", "library2",
									"--public-prefix", "js/", "--options", "library2config.js", "node_modules/library2", "js/library2.js"], extraArgsNoWatch));
bindOutput(library2);
