/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var sprintf = require("sprintf").sprintf;
var createFilenameShortener = require("./createFilenameShortener");
var path = require("path");
module.exports = function(stats, options) {
	var buf = [];

	function c(str) {
		return options.colors ? str : "";
	}

	buf.push("Hash: "+c("\033[1m") + stats.hash + c("\033[22m"));
	buf.push("Compile Time: "+c("\033[1m") + Math.round(stats.time) + "ms" + c("\033[22m"));
	buf.push("Chunks: "+c("\033[1m") + stats.chunkCount + c("\033[22m"));
	buf.push("Modules: "+c("\033[1m") + stats.modulesCount + c("\033[22m"));
	buf.push("Modules including duplicates: "+c("\033[1m") + stats.modulesIncludingDuplicates + c("\033[22m"));
	buf.push("Modules per chunk: "+c("\033[1m") + stats.modulesPerChunk + c("\033[22m"));
	buf.push("Modules first chunk: "+c("\033[1m") + stats.modulesFirstChunk + c("\033[22m"));
	if(stats.fileSizes)
		Object.keys(stats.fileSizes).forEach(function(file) {
			buf.push(c("\033[1m") + sprintf("%" + (3 + Object.keys(stats.fileSizes)[0].length) + "s", file) + c("\033[22m")+": "+c("\033[1m") + sprintf("%8d", stats.fileSizes[file]) + c("\033[22m") + " characters");
		});
	var compressFilename = options.context ? createFilenameShortener(options.context) : function(f) { return f };
	if(stats.fileModules) {
		buf.push("");
		buf.push(" <id>    <size>  <filename>");
		if(options.verbose)
			buf.push("       <reason> from <filename>");
		Object.keys(stats.fileModules).forEach(function(file) {
			buf.push(c("\033[1m\033[32m") + file + c("\033[39m\033[22m"));
			var modules = stats.fileModules[file];
			if(options["by-size"])
			modules.sort(function(a, b) {
				return b.size - a.size;
			});
			modules.forEach(function(module) {
				buf.push("  "+c("\033[1m") + sprintf("%3s", module.id+"") + " " + (typeof module.size === "number" ? sprintf("%9s", Math.round(module.size)+"") : "         ") + "  " +
					(compressFilename(module.filename) ||
					(module.dirname && ("[context] " + compressFilename(module.dirname))) ||
					"[unknown]") + c("\033[22m") + (module.fromCache ? " [from cache]" : module.toCache ? " [caching]" : ""));
			if(options.verbose) {
					module.reasons.forEach(function(reason) {
						switch(reason.type) {
						case "require":
							buf.push("       "+c("\033[36m")+"require (" + reason.count + "x) from " + compressFilename(reason.filename) + c("\033[39m"));
							break;
						case "context":
							buf.push("       "+c("\033[90m")+"context from " + compressFilename(reason.filename) + c("\033[39m"));
							break;
						case "async require":
							buf.push("       "+c("\033[35m")+"async require (" + reason.count + "x) from " + compressFilename(reason.filename) + c("\033[39m"));
							break;
						case "async context":
							buf.push("       "+c("\033[35ma")+"sync context from " + compressFilename(reason.filename) + c("\033[39m"));
							break;
						default:
							buf.push("       "+c("\033[31m") + reason.type + c("\033[39m"));
						}
					});
				}
			});
		});
	}
	if(stats.warnings) {
		stats.warnings.forEach(function(warning) {
			buf.push(c("\033[1m\033[33m")+"WARNING: " + warning + c("\033[39m\033[22m"));
		});
	}
	if(stats.errors) {
		stats.errors.forEach(function(error) {
			buf.push(c("\033[1m\033[31m")+"ERROR: " + error + c("\033[39m\033[22m"));
		});
	}
	return buf.join("\n");
};