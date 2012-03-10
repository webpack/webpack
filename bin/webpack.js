#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
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
		console.log(stats);
	});
}