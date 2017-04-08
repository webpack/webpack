#!/usr/bin/env node

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

// Local version replace global one
try {
	var localWebpack = require.resolve(path.join(process.cwd(), "node_modules", "webpack", "bin", "webpack.js"));
	if(__filename !== localWebpack) {
		return require(localWebpack);
	}
} catch(e) {}
var yargs = require("yargs")
	.usage("webpack " + require("../package.json").version + "\n" +
		"Usage: https://webpack.js.org/api/cli/\n" +
		"Usage without config file: webpack <entry> [<entry>] <output>\n" +
		"Usage with config file: webpack");

require("./config-yargs")(yargs);

var DISPLAY_GROUP = "Stats options:";
var BASIC_GROUP = "Basic options:";

yargs.options({
	"json": {
		type: "boolean",
		alias: "j",
		describe: "Prints the result as JSON."
	},
	"progress": {
		type: "boolean",
		describe: "Print compilation progress in percentage",
		group: BASIC_GROUP
	},
	"color": {
		type: "boolean",
		alias: "colors",
		default: function supportsColor() {
			return require("supports-color");
		},
		group: DISPLAY_GROUP,
		describe: "Enables/Disables colors on the console"
	},
	"sort-modules-by": {
		type: "string",
		group: DISPLAY_GROUP,
		describe: "Sorts the modules list by property in module"
	},
	"sort-chunks-by": {
		type: "string",
		group: DISPLAY_GROUP,
		describe: "Sorts the chunks list by property in chunk"
	},
	"sort-assets-by": {
		type: "string",
		group: DISPLAY_GROUP,
		describe: "Sorts the assets list by property in asset"
	},
	"hide-modules": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Hides info about modules"
	},
	"display-exclude": {
		type: "string",
		group: DISPLAY_GROUP,
		describe: "Exclude modules in the output"
	},
	"display-modules": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display even excluded modules in the output"
	},
	"display-max-modules": {
		type: "number",
		group: DISPLAY_GROUP,
		describe: "Sets the maximum number of visible modules in output"
	},
	"display-chunks": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display chunks in the output"
	},
	"display-entrypoints": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display entry points in the output"
	},
	"display-origins": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display origins of chunks in the output"
	},
	"display-cached": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display also cached modules in the output"
	},
	"display-cached-assets": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display also cached assets in the output"
	},
	"display-reasons": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display reasons about module inclusion in the output"
	},
	"display-depth": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display distance from entry point for each module"
	},
	"display-used-exports": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display information about used exports in modules (Tree Shaking)"
	},
	"display-provided-exports": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display information about exports provided from modules"
	},
	"display-error-details": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Display details about errors"
	},
	"verbose": {
		type: "boolean",
		group: DISPLAY_GROUP,
		describe: "Show more details"
	}
});

var argv = yargs.argv;

if(argv.verbose) {
	argv["display-reasons"] = true;
	argv["display-depth"] = true;
	argv["display-entrypoints"] = true;
	argv["display-used-exports"] = true;
	argv["display-provided-exports"] = true;
	argv["display-error-details"] = true;
	argv["display-modules"] = true;
	argv["display-cached"] = true;
	argv["display-cached-assets"] = true;
}

var options = require("./convert-argv")(yargs, argv);

function ifArg(name, fn, init) {
	if(Array.isArray(argv[name])) {
		if(init) init();
		argv[name].forEach(fn);
	} else if(typeof argv[name] !== "undefined") {
		if(init) init();
		fn(argv[name], -1);
	}
}

function processOptions(options) {
	// process Promise
	if(typeof options.then === "function") {
		options.then(processOptions).catch(function(err) {
			console.error(err.stack || err);
			process.exit(1); // eslint-disable-line
		});
		return;
	}

	var firstOptions = [].concat(options)[0];
	var statsPresetToOptions = require("../lib/Stats.js").presetToOptions;

	var outputOptions = options.stats;
	if(typeof outputOptions === "boolean" || typeof outputOptions === "string") {
		outputOptions = statsPresetToOptions(outputOptions);
	} else if(!outputOptions) {
		outputOptions = {};
	}
	outputOptions = Object.create(outputOptions);
	if(Array.isArray(options) && !outputOptions.children) {
		outputOptions.children = options.map(o => o.stats);
	}
	if(typeof outputOptions.context === "undefined")
		outputOptions.context = firstOptions.context;

	ifArg("json", function(bool) {
		if(bool)
			outputOptions.json = bool;
	});

	if(typeof outputOptions.colors === "undefined")
		outputOptions.colors = require("supports-color");

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
		if(typeof outputOptions.cached === "undefined")
			outputOptions.cached = false;
		if(typeof outputOptions.cachedAssets === "undefined")
			outputOptions.cachedAssets = false;

		ifArg("display-chunks", function(bool) {
			outputOptions.modules = !bool;
			outputOptions.chunks = bool;
		});

		ifArg("display-entrypoints", function(bool) {
			outputOptions.entrypoints = bool;
		});

		ifArg("display-reasons", function(bool) {
			outputOptions.reasons = bool;
		});

		ifArg("display-depth", function(bool) {
			outputOptions.depth = bool;
		});

		ifArg("display-used-exports", function(bool) {
			outputOptions.usedExports = bool;
		});

		ifArg("display-provided-exports", function(bool) {
			outputOptions.providedExports = bool;
		});

		ifArg("display-error-details", function(bool) {
			outputOptions.errorDetails = bool;
		});

		ifArg("display-origins", function(bool) {
			outputOptions.chunkOrigins = bool;
		});

		ifArg("display-max-modules", function(value) {
			outputOptions.maxModules = value;
		});

		ifArg("display-cached", function(bool) {
			if(bool)
				outputOptions.cached = true;
		});

		ifArg("display-cached-assets", function(bool) {
			if(bool)
				outputOptions.cachedAssets = true;
		});

		if(!outputOptions.exclude)
			outputOptions.exclude = ["node_modules", "bower_components", "components"];

		if(argv["display-modules"]) {
			outputOptions.maxModules = Infinity;
			outputOptions.exclude = undefined;
		}
	} else {
		if(typeof outputOptions.chunks === "undefined")
			outputOptions.chunks = true;
		if(typeof outputOptions.entrypoints === "undefined")
			outputOptions.entrypoints = true;
		if(typeof outputOptions.modules === "undefined")
			outputOptions.modules = true;
		if(typeof outputOptions.chunkModules === "undefined")
			outputOptions.chunkModules = true;
		if(typeof outputOptions.reasons === "undefined")
			outputOptions.reasons = true;
		if(typeof outputOptions.cached === "undefined")
			outputOptions.cached = true;
		if(typeof outputOptions.cachedAssets === "undefined")
			outputOptions.cachedAssets = true;
	}

	ifArg("hide-modules", function(bool) {
		if(bool) {
			outputOptions.modules = false;
			outputOptions.chunkModules = false;
		}
	});

	var webpack = require("../lib/webpack.js");

	Error.stackTraceLimit = 30;
	var lastHash = null;
	var compiler;
	try {
		compiler = webpack(options);
	} catch(e) {
		var WebpackOptionsValidationError = require("../lib/WebpackOptionsValidationError");
		if(e instanceof WebpackOptionsValidationError) {
			if(argv.color)
				console.error("\u001b[1m\u001b[31m" + e.message + "\u001b[39m\u001b[22m");
			else
				console.error(e.message);
			process.exit(1); // eslint-disable-line no-process-exit
		}
		throw e;
	}

	if(argv.progress) {
		var ProgressPlugin = require("../lib/ProgressPlugin");
		compiler.apply(new ProgressPlugin({
			profile: argv.profile
		}));
	}

	function compilerCallback(err, stats) {
		if(!options.watch || err) {
			// Do not keep cache anymore
			compiler.purgeInputFileSystem();
		}
		if(err) {
			lastHash = null;
			console.error(err.stack || err);
			if(err.details) console.error(err.details);
			process.exit(1); // eslint-disable-line
		}
		if(outputOptions.json) {
			process.stdout.write(JSON.stringify(stats.toJson(outputOptions), null, 2) + "\n");
		} else if(stats.hash !== lastHash) {
			lastHash = stats.hash;
			process.stdout.write(stats.toString(outputOptions) + "\n");
		}
		if(!options.watch && stats.hasErrors()) {
			process.on("exit", function() {
				process.exit(2); // eslint-disable-line
			});
		}
	}
	if(firstOptions.watch || options.watch) {
		var watchOptions = firstOptions.watchOptions || firstOptions.watch || options.watch || {};
		if(watchOptions.stdin) {
			process.stdin.on("end", function() {
				process.exit(0); // eslint-disable-line
			});
			process.stdin.resume();
		}
		compiler.watch(watchOptions, compilerCallback);
		console.log("\nWebpack is watching the files…\n");
	} else
		compiler.run(compilerCallback);

}

processOptions(options);
