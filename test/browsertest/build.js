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
// node ../../bin/webpack --output-pathinfo --colors --optimize-max-chunks 1 --output-library library1 library1 js/library1
var library1 = cp.spawn("node", join(["../../bin/webpack.js", "--output-pathinfo", "--colors", "--optimize-max-chunks", "1", "--output-library", "library1",
										"library1", "js/library1.js"], extraArgsNoWatch));
bindOutput(library1);
library1.on("exit", function(code) {
	if(code === 0) {
		// node ../../bin/webpack --output-pathinfo --colors --resolve-alias vm=vm-browserify --output-public-path js/ --module-bind json --module-bind css=style!css --module-bind less=style!css!less --module-bind coffee --module-bind jade ./lib/index js/web.js
		var main = cp.spawn("node", join(["../../bin/webpack.js", "--output-pathinfo", "--colors", "--resolve-alias", "vm=vm-browserify", "--workers",
											"--output-public-path", "js/", "--module-bind", "json", "--module-bind", "css=style!css", "--module-bind", "less=style!css!less", "--module-bind", "coffee", "--module-bind", "jade", "./lib/index", "js/web.js"], extraArgs));
		bindOutput(main);
	}
});
// node ../../bin/webpack --output-pathinfo --colors --output-library library2 --output-public-path js/ --config library2config.js library2 library2b js/library2.js
var library2 = cp.spawn("node", join(["../../bin/webpack.js", "--output-pathinfo", "--colors", "--output-library", "library2",
									"--output-public-path", "js/", "--config", "library2config.js", "library2", "library2b", "js/library2.js"], extraArgsNoWatch));
bindOutput(library2);
