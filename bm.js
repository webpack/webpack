/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var webpack = require("./lib/webpack");
var path = require("path");

var TIMES = 5;

/* TESTS */

var root = path.join(__dirname, "test", "browsertest");

var testCases = {
	"javascript          ": path.join(root, "lib", "a.js"),
	"javascript with deps": path.join(root, "lib", "b.js"),
	"css                 ": path.join(root, "node_modules", "resources-module", "stylesheet-import2.css"),
	"less                ": path.join(root, "node_modules", "resources-module", "import2.less"),
	"jade                ": path.join(root, "resources", "template.jade"),
	"json                ": path.join(__dirname, "package.json"),
	"coffee              ": path.join(root, "resources", "script.coffee"),
	"file                ": path.join(__dirname, "node_modules", "file-loader", "png.js") + "!" + path.join(root, "img", "image.png"),
	"raw                 ": path.join(__dirname, "node_modules", "raw-loader") + "!" + path.join(root, "resources", "abc.txt"),
	"mixed               ": path.join(root, "lib", "index.web.js"),
}

var TESTS = {}

Object.keys(testCases).forEach(function(name) {
	TESTS[name + "                     "] = runWebpack.bind(null, name, testCases[name], false, false, false);
	TESTS[name + " single              "] = runWebpack.bind(null, name, testCases[name], true,  false, false);
	TESTS[name + "        debug        "] = runWebpack.bind(null, name, testCases[name], false, true,  false);
	TESTS[name + " single debug        "] = runWebpack.bind(null, name, testCases[name], true,  true,  false);
	TESTS[name + "        min          "] = runWebpack.bind(null, name, testCases[name], false, false, true );
	TESTS[name + " single min          "] = runWebpack.bind(null, name, testCases[name], true,  false, true );
});

function runWebpack(name, file, single, debug, min, cb) {
	webpack({
		entry: file,
		output: {
			path: path.join(root, "js", "bm"),
			filename: name.trim() + ".js"
		},
		optimize: {
			maxChunks: single ? 1 : undefined,
			minimize: min,
		},
		debug: debug
	}, cb);
}

/* MAIN */

asyncForEach(Object.keys(TESTS), function(name, done) {
	var test = TESTS[name];
	test(function() {
		var startTime = new Date();
		asyncTimes(test, TIMES, function(err) {
			if(err) throw err;
			var endTime = new Date();
			var time = (endTime - startTime) / TIMES;
			console.log(name + "\t" + time + "ms");
			done();
		});
	});
}, function() {
});

/* HELPERS */

function asyncForEach(items, fn, cb) {
	var i = -1;
	(function run() {
		i++;
		if(i < items.length) {
			fn(items[i], run);
		} else {
			cb();
		}
	}());
}

function asyncTimes(fn, count, cb) {
	(function run(err) {
		if(err) return cb(err);
		if(count-- == 0) return cb();
		fn(run);
	}())
}
