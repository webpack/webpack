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

if(argv.filenames) {
	options.includeFilenames = true;
}

if(argv.libary) {
	options.libary = argv.libary;
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
			console.log("Chunks: \033[1m" + stats.chunkCount + "\033[22m");
			console.log("Modules: \033[1m" + stats.modulesCount + "\033[22m");
			console.log("Modules including duplicates: \033[1m" + stats.modulesIncludingDuplicates + "\033[22m");
			console.log("Modules pre chunk: \033[1m" + stats.modulesPerChunk + "\033[22m");
			console.log("Modules first chunk: \033[1m" + stats.modulesFirstChunk + "\033[22m");
			if(stats.fileSizes)
				for(var file in stats.fileSizes) {
					console.log("\033[1m" + sprintf("%" + (5 + options.output.length) + "s", file) + "\033[22m: \033[1m" + sprintf("%8d", stats.fileSizes[file]) + "\033[22m characters");
				};
			if(stats.fileModules) {
				for(var file in stats.fileModules) {
					console.log("\033[1m\033[32m" + file + "\033[39m\033[22m");
					var modules = stats.fileModules[file];
					modules.forEach(function(module) {
						console.log("  \033[1m" + sprintf("%3s", module.id+"") + " " + (module.filename || (module.dirname && ("generated " + module.dirname)) || "generated") + "\033[22m");
						module.reasons.forEach(function(reason) {
							switch(reason.type) {
							case "require":
								console.log("       \033[36mrequire (" + reason.count + "x) from " + reason.filename + "\033[39m");
								break;
							case "context":
								console.log("       \033[90mcontext from " + reason.filename + "\033[39m");
								break;
							case "ensure":
								console.log("       \033[35mensure from " + reason.filename + "\033[39m");
								break;
							default:
								console.log("       \033[31m" + reason.type + "\033[39m");
							}
						});
					});
				}
			}
			if(stats.warnings) {
				stats.warnings.forEach(function(warning) {
					console.log("\033[1m\033[33mWARNING: " + warning + "\033[39m\033[22m");
				});
			}
		}
	});
}