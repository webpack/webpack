#!/usr/bin/env node

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var fs = require("fs");
var util = require("util");
var sprintf = require("sprintf").sprintf;
var argv = require("optimist")
	.usage("Usage: $0 <input> <output>")

	.boolean("single")
	.describe("single", "Disable Code Splitting")
	.default("single", false)

	.boolean("min")
	.describe("min", "Minimize it with uglifyjs")
	.default("min", false)

	.boolean("filenames")
	.describe("filenames", "Output Filenames Into File")
	.default("filenames", false)

	.string("options")
	.describe("options", "Options JSON File")

	.string("script-src-prefix")
	.describe("script-src-prefix", "Path Prefix For JavaScript Loading")

	.string("libary")
	.describe("libary", "Stores the exports into this variable")

	.boolean("colors")
	.describe("colors", "Output Stats with colors")
	.default("colors", false)

	.boolean("json")
	.describe("json", "Output Stats as JSON")
	.default("json", false)

	.boolean("by-size")
	.describe("by-size", "Sort modules by size in Stats")
	.default("by-size", false)

	.boolean("verbose")
	.describe("verbose", "Output dependencies in Stats")
	.default("verbose", false)

	.string("alias")
	.describe("alias", "Set a alias name for a module. ex. http=http-browserify")

	.boolean("debug")
	.describe("debug", "Prints debug info to output files")
	.default("debug", false)

	.demand(1)
	.argv;

var input = argv._[0],
	output = argv._[1];

if (input && input[0] !== '/' && input[1] !== ':') {
	input = path.join(process.cwd(), input);
}
if (output && output[0] !== '/' && input[1] !== ':') {
	output = path.join(process.cwd(), output);
}

var options = {};

if(argv.options) {
	options = JSON.parse(fs.readFileSync(argv.options, "utf-8"));
}

if(argv["script-src-prefix"]) {
	options.scriptSrcPrefix = argv["script-src-prefix"];
}

if(argv.min) {
	options.minimize = true;
}

if(argv.debug) {
	options.debug = true;
}

if(argv.filenames) {
	options.includeFilenames = true;
}

if(argv.libary) {
	options.libary = argv.libary;
}

if(argv.alias) {
	if(typeof argv.alias === "string")
		argv.alias = [argv.alias];
	options.resolve = options.resolve || {};
	options.resolve.alias = options.resolve.alias || {};
	var aliasObj = options.resolve.alias;
	argv.alias.forEach(function(alias) {
		alias = alias.split("=");
		aliasObj[alias[0]] = alias[1];
	});
}

var webpack = require("../lib/webpack.js");

if(argv.single) {
	webpack(input, options, function(err, source) {
		if(err) {
			console.error(err);
			return;
		}
		if(output) {
			fs.writeFileSync(output, source, "utf-8");
		} else {
			process.stdout.write(source);
		}
	});
} else {
	output = output || path.join(process.cwd(), "js", "web.js");
	if(!options.outputDirectory) options.outputDirectory = path.dirname(output);
	if(!options.output) options.output = path.basename(output);
	if(!options.outputPostfix) options.outputPostfix = "." + path.basename(output);
	var outExists = path.existsSync(options.outputDirectory);
	if(!outExists)
		fs.mkdirSync(options.outputDirectory);
	webpack(input, options, function(err, stats) {
		if(err) {
			console.error(err);
			return;
		}
		if(argv.json)
			console.log(util.inspect(stats, false, 10, argv.colors));
		else {
			function c(str) {
				return argv.colors ? str : "";
			}
			console.log("Chunks: "+c("\033[1m") + stats.chunkCount + c("\033[22m"));
			console.log("Modules: "+c("\033[1m") + stats.modulesCount + c("\033[22m"));
			console.log("Modules including duplicates: "+c("\033[1m") + stats.modulesIncludingDuplicates + c("\033[22m"));
			console.log("Modules pre chunk: "+c("\033[1m") + stats.modulesPerChunk + c("\033[22m"));
			console.log("Modules first chunk: "+c("\033[1m") + stats.modulesFirstChunk + c("\033[22m"));
			if(stats.fileSizes)
				for(var file in stats.fileSizes) {
					console.log(c("\033[1m") + sprintf("%" + (5 + options.output.length) + "s", file) + c("\033[22m")+": "+c("\033[1m") + sprintf("%8d", stats.fileSizes[file]) + c("\033[22m") + " characters");
				};
			var cwd = process.cwd();
			var cwdParent = path.dirname(cwd);
			var buildins = path.join(__dirname, "..");
			cwd = cwd.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			cwd = new RegExp("^" + cwd + "|(!)" + cwd, "g");
			cwdParent = cwdParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			cwdParent = new RegExp("^" + cwdParent + "|(!)" + cwdParent, "g");
			buildins = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			buildins = new RegExp("^" + buildins + "|(!)" + buildins, "g");
			function compressFilename(filename) {
				if(!filename)
					return filename;
				filename = filename.replace(buildins, "!(webpack)");
				filename = filename.replace(cwd, "!.");
				filename = filename.replace(cwdParent, "!..");
				return filename.replace(/^!/, "");
			}
			if(stats.fileModules) {
				console.log();
				console.log(" <id>    <size>  <filename>");
				if(argv.verbose)
					console.log("       <reason> from <filename>");
				for(var file in stats.fileModules) {
					console.log(c("\033[1m\033[32m") + file + c("\033[39m\033[22m"));
					var modules = stats.fileModules[file];
					if(argv["by-size"])
					modules.sort(function(a, b) {
						return b.size - a.size;
					});
					modules.forEach(function(module) {
						console.log("  "+c("\033[1m") + sprintf("%3s", module.id+"") + " " + (typeof module.size === "number" ? sprintf("%9s", Math.round(module.size)+"") : "         ") + "  " +
							(compressFilename(module.filename) ||
							(module.dirname && ("[context] " + compressFilename(module.dirname))) ||
							"[unknown]") + c("\033[22m"));
					if(argv.verbose) {
							module.reasons.forEach(function(reason) {
								switch(reason.type) {
								case "require":
									console.log("       "+c("\033[36m")+"require (" + reason.count + "x) from " + compressFilename(reason.filename) + c("\033[39m"));
									break;
								case "context":
									console.log("       "+c("\033[90m")+"context from " + compressFilename(reason.filename) + c("\033[39m"));
									break;
								case "async require":
									console.log("       "+c("\033[35m")+"async require (" + reason.count + "x) from " + compressFilename(reason.filename) + c("\033[39m"));
									break;
								case "async context":
									console.log("       "+c("\033[35ma")+"sync context from " + compressFilename(reason.filename) + c("\033[39m"));
									break;
								default:
									console.log("       "+c("\033[31m") + reason.type + c("\033[39m"));
								}
							});
						}
					});
				}
			}
			if(stats.warnings) {
				stats.warnings.forEach(function(warning) {
					console.log(c("\033[1m\033[33m")+"WARNING: " + warning + c("\033[39m\033[22m"));
				});
			}
			if(stats.errors) {
				stats.errors.forEach(function(error) {
					console.log(c("\033[1m\033[31m")+"ERROR: " + error + c("\033[39m\033[22m"));
				});
			}
		}
	});
}