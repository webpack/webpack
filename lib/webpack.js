/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var buildDeps = require("./buildDeps");
var path = require("path");
var writeChunk = require("./writeChunk");
var fs = require("fs");

var templateAsync = require("fs").readFileSync(path.join(__dirname, "templateAsync.js"));
var templateSingle = require("fs").readFileSync(path.join(__dirname, "templateSingle.js"));
/*
	webpack(context, moduleName, options, callback);
	webpack(context, moduleName, callback);
	webpack(absoluteModulePath, options, callback);
	webpack(absoluteModulePath, callback);

	callback: function(err, source / stats)
	  source if options.output is not set
	  else stats json

	options:
	- outputJsonpFunction
	   JSONP function used to load chunks
	- scriptSrcPrefix
	   Path from where chunks are loaded
	- outputDirectory
	   write files to this directory (absolute path)
	- output
	   write first chunk to this file
	- outputPostfix
	   write chunks to files named chunkId plus outputPostfix
	- libary
	   exports of input file are stored in this variable
	- minimize
	   minimize outputs with uglify-js
	- includeFilenames
	   add absolute filenames of input files as comments
*/
module.exports = function(context, moduleName, options, callback) {
	if(typeof moduleName === "object") {
		callback = options;
		options = moduleName;
		moduleName = "./" + path.basename(context);
		context = path.dirname(context);
	}
	if(typeof moduleName === "function") {
		callback = moduleName;
		options = {};
		moduleName = "./" + path.basename(context);
		context = path.dirname(context);
	}
	if(!callback) {
		callback = options;
		options = {};
	}
	buildDeps(context, moduleName, options, function(err, depTree) {
		if(err) {
			callback(err);
			return;
		}
		var buffer = [];
		if(options.output) {
			if(!options.outputJsonpFunction)
				options.outputJsonpFunction = "webpackJsonp" + (options.libary  || "");
			options.scriptSrcPrefix = options.scriptSrcPrefix || "";
			if(!options.outputDirectory) {
				options.outputDirectory = path.dirname(options.output);
				options.output = path.basename(options.output);
			}
			if(!options.outputPostfix) {
				options.outputPostfix = "." + options.output;
			}
			var fileSizeMap = {};
			var fileModulesMap = {};
			var chunksCount = 0;
			for(var chunkId in depTree.chunks) {
				var chunk = depTree.chunks[chunkId];
				if(chunk.empty) continue;
				if(chunk.equals !== undefined) continue;
				chunksCount++;
				var filename = path.join(options.outputDirectory,
					chunk.id === 0 ? options.output : chunk.id + options.outputPostfix);
				buffer = [];
				if(chunk.id === 0) {
					if(options.libary) {
						buffer.push("/******/var ");
						buffer.push(options.libary);
						buffer.push("=\n");
					}
					if(Object.keys(depTree.chunks).length > 1) {
						buffer.push(templateAsync);
						buffer.push("/******/({a:");
						buffer.push(stringify(options.outputPostfix));
						buffer.push(",b:");
						buffer.push(stringify(options.outputJsonpFunction));
						buffer.push(",c:");
						buffer.push(stringify(options.scriptSrcPrefix));
						buffer.push(",\n");
					} else {
						buffer.push(templateSingle);
						buffer.push("/******/({\n");
					}
				} else {
					buffer.push("/******/");
					buffer.push(options.outputJsonpFunction);
					buffer.push("(");
					buffer.push(chunk.id);
					buffer.push(", {\n");
				}
				buffer.push(writeChunk(depTree, chunk, options));
				buffer.push("/******/})");
				buffer = buffer.join("");
				if(options.minimize) buffer = uglify(buffer, filename);
				fs.writeFile(filename, buffer, "utf-8", function(err) {
					if(err) throw err;
				});
				fileSizeMap[path.basename(filename)] = buffer.length;
				var modulesArray = [];
				for(var moduleId in chunk.modules) {
					if(chunk.modules[moduleId] === "include")
						modulesArray.push({id: moduleId, filename: depTree.modulesById[moduleId].filename});
				}
				fileModulesMap[path.basename(filename)] = modulesArray;
			}
			buffer = {};
			buffer.chunkCount = chunksCount;
			buffer.modulesCount = Object.keys(depTree.modulesById).length;
			var sum = 0;
			for(var chunkId in depTree.chunks) {
				for(var moduleId in depTree.chunks[chunkId].modules) {
					if(depTree.chunks[chunkId].modules[moduleId] === "include")
						sum++;
				}
			}
			buffer.modulesIncludingDuplicates = sum;
			buffer.modulesPerChunk = Math.round(sum / chunksCount*10)/10;
			sum = 0;
			for(var moduleId in depTree.chunks[0].modules) {
				if(depTree.chunks[0].modules[moduleId] === "include")
					sum++;
			}
			buffer.modulesFirstChunk = sum;
			buffer.fileSizes = fileSizeMap;
			buffer.warnings = depTree.warnings;
			buffer.fileModules = fileModulesMap;
			callback(null, buffer);
		} else {
			if(options.libary) {
				buffer.push("/******/var ");
				buffer.push(options.libary);
				buffer.push("=\n");
			}
			buffer.push(templateSingle);
			buffer.push("/******/({\n");
			buffer.push(writeChunk(depTree, options));
			buffer.push("/******/})");
			buffer = buffer.join("");
			if(options.minimize) buffer = uglify(buffer, "output");
			callback(null, buffer);
		}
	});
}

function uglify(input, filename) {
	var uglify = require("uglify-js");
	try {
		source = uglify.parser.parse(input);
		source = uglify.uglify.ast_mangle(source);
		source = uglify.uglify.ast_squeeze(source);
		source = uglify.uglify.gen_code(source);
	} catch(e) {
		console.error(filename + " @ Line " + e.line + ", Col " + e.col + ", " + e.message);
		return input;
	}
	return source;
}

function stringify(str) {
	return '"' + str.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"") + '"';
}