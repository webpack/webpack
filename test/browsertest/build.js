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

console.log("compile scripts…");

var extraArgsNoWatch = extraArgs.slice(0);
var watchIndex = extraArgsNoWatch.indexOf("--watch");
if(watchIndex != -1) extraArgsNoWatch.splice(watchIndex, 1);
// node ../../bin/webpack --output-pathinfo --color --optimize-max-chunks 1 --output-library library1 node_modules/library1 js/library1
var library1 = cp.spawn("node", join(["../../bin/webpack.js", "--output-pathinfo", "--color", "--optimize-max-chunks", "1", "--output-library", "library1",
										"node_modules/library1", "js/library1.js"], extraArgsNoWatch));
bindOutput(library1);
library1.on("exit", function(code) {
	if(code === 0) {
		// node ../../bin/webpack --output-pathinfo --color --resolve-alias vm=vm-browserify --output-public-path js/ --output-chunk-filename [name].web.js --module-bind css=style!css --module-bind less=style-loader!css-loader!less-loader --module-bind coffee --module-bind jade --prefetch ./lib/stylesheet.less ./lib/index "js/web.js?h=[hash]"
		var main = cp.spawn("node", join(["../../bin/webpack.js", "--output-pathinfo", "--color", "--resolve-alias", "vm=vm-browserify",
											"--output-public-path", "js/", "--output-chunk-filename", "[name].web.js",
											"--module-bind", "css=style-loader!css-loader", "--module-bind", "less=style-loader/url!file-loader?postfix=.css&string!less-loader", "--module-bind", "coffee", "--module-bind", "jade", "--prefetch", "./lib/stylesheet.less", "./lib/index", "js/web.js?h=[hash]", "--progress"], extraArgs));
		bindOutput(main);
	}
});
// node ../../bin/webpack --output-pathinfo --color --output-library-target umd --output-jsonp-function webpackJsonpLib2 --output-public-path js/ --output-chunk-filename [chunkhash].lib2.js --config library2config.coffee library2b library2 js/library2.js
var library2 = cp.spawn("node", join(["../../bin/webpack.js", "--output-pathinfo", "--color", "--output-library-target", "umd", "--output-jsonp-function", "webpackJsonpLib2",
									"--output-public-path", "js/", "--output-chunk-filename", "[chunkhash].lib2.js", "--config", "library2config.coffee", "library2b", "library2", "js/library2.js"], extraArgsNoWatch));
bindOutput(library2);
