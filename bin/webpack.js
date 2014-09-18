#!/usr/bin/env node

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
// Local version replace global one
try {
	var localWebpack = require.resolve(path.join(process.cwd(), "node_modules", "webpack", "bin", "webpack.js"));
	if(__filename != localWebpack) {
		return require(localWebpack);
	}
} catch(e) {}
var fs = require("fs");
var util = require("util");
var optimist = require("optimist")
	.usage("webpack " + require("../package.json").version + "\n" +
		"Usage: http://webpack.github.io/docs/cli.html")
	
require("./config-optimist")(optimist);

optimist

	.boolean("json").alias("json", "j").describe("json")
	
	.boolean("colors").alias("colors", "c").describe("colors")

	.string("sort-modules-by").describe("sort-modules-by")

	.string("sort-chunks-by").describe("sort-chunks-by")

	.string("sort-assets-by").describe("sort-assets-by")

	.boolean("hide-modules").describe("hide-modules")

	.string("display-exclude").describe("display-exclude")

	.boolean("display-modules").describe("display-modules")

	.boolean("display-chunks").describe("display-chunks")

	.boolean("display-error-details").describe("display-error-details")

	.boolean("display-origins").describe("display-origins")

	.boolean("display-cached").describe("display-cached")

	.boolean("display-cached-assets").describe("display-cached-assets")

	.boolean("display-reasons").alias("display-reasons", "verbose").alias("display-reasons", "v").describe("display-reasons");

	
var argv = optimist.argv;

var options = require("./convert-argv")(optimist, argv);

function ifArg(name, fn, init) {
	if(Array.isArray(argv[name])) {
		if(init) init();
		argv[name].forEach(fn);
	} else if(typeof argv[name] != "undefined") {
		if(init) init();
		fn(argv[name], -1);
	}
}



var outputOptions = {
	cached: false,
	cachedAssets: false,
	context: options.context
};

ifArg("json", function(bool) {
	outputOptions.json = bool;
});

ifArg("colors", function(bool) {
	outputOptions.colors = bool;
});

ifArg("sort-modules-by", function(value) {
	outputOptions.modulesSort = value;
});

ifArg("sort-chunks-by", function(value) {
	outputOptions.chunksSort = value;
});

ifArg("sort-assets-by", function(value) {
	outputOptions.assetsSort = value;
});

ifArg("display-exclude", function(value) {
	outputOptions.exclude = value;
});

if(!outputOptions.json) {
	ifArg("display-chunks", function(bool) {
		outputOptions.modules = !bool;
		outputOptions.chunks = bool;
	});

	ifArg("display-reasons", function(bool) {
		outputOptions.reasons = bool;
	});

	ifArg("display-error-details", function(bool) {
		outputOptions.errorDetails = bool;
	});

	ifArg("display-origins", function(bool) {
		outputOptions.chunkOrigins = bool;
	});

	ifArg("display-cached", function(bool) {
		if(bool)
			outputOptions.cached = true;
	});

	ifArg("display-cached-assets", function(bool) {
		if(bool)
			outputOptions.cachedAssets = true;
	});
	
	if(!outputOptions.exclude && !argv["display-modules"])
		outputOptions.exclude = ["node_modules", "bower_components", "jam", "components"];
} else {
	outputOptions.chunks = true;
	outputOptions.modules = true;
	outputOptions.chunkModules = true;
	outputOptions.reasons = true;
	outputOptions.cached = true;
	outputOptions.cachedAssets = true;
}

ifArg("hide-modules", function(bool) {
	if(bool) {
		outputOptions.modules = false;
		outputOptions.chunkModules = false;
	}
});

var webpack = require("../lib/webpack.js");

Error.stackTrackLimit = 30;
var lastHash = null;
var compiler = webpack(options, function(err, stats) {
	if(!options.watch) {
		// Do not keep cache anymore
		compiler.purgeInputFileSystem();
	}
	if(err) {
		lastHash = null;
		console.error(err.stack || err);
		if(err.details) console.error(err.details);
		if(!options.watch) {
			process.on("exit", function() {
				process.exit(1);
			});
		}
		return;
	}
	if(outputOptions.json) {
		process.stdout.write(JSON.stringify(stats.toJson(outputOptions), null, 2) + "\n");
	} else if(stats.hash !== lastHash) {
		lastHash = stats.hash;
		process.stdout.write(stats.toString(outputOptions) + "\n");
	}
});
