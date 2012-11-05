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
var sprintf = require("sprintf").sprintf;
var argv = require("optimist")
	.usage("webpack " + require("../package.json").version + "\n" +
		"Usage: $0 <input> <output>")

	.boolean("min")
	.describe("min", "Minimize it with uglifyjs")
	.default("min", false)

	.boolean("filenames")
	.describe("filenames", "Output Filenames Into File")
	.default("filenames", false)

	.string("options")
	.describe("options", "Options JSON File")

	.string("public-prefix")
	.describe("public-prefix", "Path Prefix For JavaScript Loading")

	.string("library")
	.describe("library", "Stores the exports into this variable")

	.boolean("colors")
	.describe("colors", "Output Stats with colors")
	.default("colors", false)

	.boolean("single")
	.describe("single", "Disable lazy loading")
	.default("single", false)

	.boolean("json")
	.describe("json", "Output Stats as JSON")
	.default("json", false)

	.boolean("by-size")
	.describe("by-size", "Sort modules by size in Stats")
	.default("by-size", false)

	.boolean("verbose")
	.describe("verbose", "Output dependencies in Stats")
	.default("verbose", false)

	.boolean("profile")
	.describe("profile", "Capture timings for modules")
	.default("profile", false)

	.string("alias")
	.describe("alias", "Set a alias name for a module. ex. http=http-browserify")

	.boolean("debug")
	.describe("debug", "Prints debug info to output files")
	.default("debug", false)

	.boolean("watch")
	.describe("watch", "Recompiles on changes (except loaders)")
	.default("watch", false)

	.describe("watch-delay", "Timeout to wait for the last change")
	.default("watch", false)

	.boolean("workers")
	.describe("workers", "Use worker processes to be faster (BETA)")
	.default("workers", false)

	.boolean("progress")
	.describe("progress", "Displays a progress while compiling")
	.default("progress", false)

	.demand(1) // DEPRECATED
	.argv;

var input = argv._[0],
	output = argv._[1];

var inputFile = input && input.split("!").pop()
if (inputFile && inputFile[0] !== '/' && inputFile[1] !== ':') {
	input = input.split("!");
	input.pop();
	input.push(path.join(process.cwd(), inputFile));
	input = input.join("!");
}
var outputFile = output && output.split("!").pop();
if (output && output[0] !== '/' && input[1] !== ':') {
	output = output.split("!");
	output.pop();
	output.push(path.join(process.cwd(), outputFile));
	output = output.join("!");
}

var options = {};

if(argv.options) {
	options = require(path.join(process.cwd(), argv.options));
}

if(argv["public-prefix"]) {
	options.publicPrefix = argv["public-prefix"];
}

if(argv.min) {
	options.minimize = true;
}

if(argv.debug) {
	options.debug = true;
}

if(argv.single) {
	options.single = true;
}

if(argv.watch) {
	options.watch = true;
}

if(argv.workers) {
	options.workers = true;
}

if(argv.profile) {
	options.profile = true;
}

if(argv["watch-delay"]) {
	options.watchDelay = argv["watch-delay"];
}

if(argv.filenames) {
	options.includeFilenames = true;
}

if(argv.library) {
	options.library = argv.library;
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
var formatOutput = require("../lib/formatOutput.js");

function c(str) {
	return argv.colors ? str : "";
}

output = output || path.join(process.cwd(), "js", "web.js");
if(!options.outputDirectory) options.outputDirectory = path.dirname(output);
if(!options.output) options.output = path.basename(output);
if(!options.outputPostfix) options.outputPostfix = "." + path.basename(output);
if(!options.context) options.context = process.cwd();

// some listeners for the progress display
if(argv.progress) {
	if(!options.events) options.events = new (require("events").EventEmitter)();
	var events = options.events;

	var nextUpdate = 0;
	var sum = 0;
	var finished = 0;
	var chars = 0;
	function print(force) {
		if(!force && nextUpdate > new Date().getTime()) return;
		nextUpdate = new Date().getTime() + 100;
		var msg = "";
		if(sum > 0) {
			var precentage = Math.floor(finished*100/sum);
			msg += "compiling... (" + c("\033[1m\033[33m");
			msg += sprintf("%4s", finished+"") + "/" + sprintf("%4s", sum+"");
			msg += " " + sprintf("%4s", precentage+"%");
			msg += c("\033[39m\033[22m") + ")";
			for(var i = 0; i < Math.floor(precentage/2); i++)
				msg += "#";
		}
		for(var i = msg.length; i < chars; i++)
			msg += " ";
		for(var i = 0; i < chars; i++)
			process.stderr.write("\b");
		process.stderr.write(msg);
		chars = msg.length;
	}
	events.on("task", function(name) {
		sum++;
		print();
	});
	events.on("task-end", function(name) {
		finished++;
		if(name) {
			for(var i = 0; i < chars; i++)
				process.stderr.write("\b \b");
			process.stderr.write(name + " " + c("\033[1m\033[32m") + "done" + c("\033[39m\033[22m") + "\n");
			chars = 0;
			return print(true);
		}
		print();
	});
	events.on("bundle", function(name) {
		sum = 0;
		finished = 0;
		for(var i = 0; i < chars; i++)
			process.stderr.write("\b \b");
		chars = 0;
	});
}

// do the stuff
webpack(input, options, function(err, stats) {
	if(err) {
		console.error(err);
		return;
	}
	if(argv.json)
		console.log(JSON.stringify(stats, null, 2));
	else {
		console.log(formatOutput(stats, {
			colors: argv.colors,
			"by-size": argv["by-size"],
			verbose: argv.verbose,
			context: options.context
		}));
	}
});