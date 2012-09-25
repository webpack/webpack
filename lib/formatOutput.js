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
	buf.push("Modules first chunk: "+c("\033[1m") + stats.modulesFirstChunk + c("\033[22m"));
	if(stats.fileSizes) {
		var maxLenFilename = 0;
		var maxLenChunkname = 0;
		Object.keys(stats.fileSizes).forEach(function(file) {
			if(file.length > maxLenFilename) maxLenFilename = file.length;
		});
		var fileChunkNames = {};
		Object.keys(stats.chunkNameFiles).forEach(function(name) {
			if(name.length > maxLenChunkname) maxLenChunkname = name.length;
			fileChunkNames[stats.chunkNameFiles[name]] = name;
		});
		Object.keys(stats.fileSizes).forEach(function(file) {
			var name = fileChunkNames[file] || "";
			var fileLine = sprintf("%" + maxLenChunkname + "s", name) + c("\033[1m") + sprintf("%" + (3 + maxLenFilename) + "s", file) + c("\033[22m")+": "+c("\033[1m") + sprintf("%8d", stats.fileSizes[file]) + c("\033[22m") + " chars/bytes ";
			buf.push(fileLine);
		});
	}
	var compressFilename = options.context ? createFilenameShortener(options.context) : function(f) { return f };
	if(stats.fileModules) {
		buf.push("");
		buf.push(" <id>    <size>  <filename>");
		if(options.verbose)
			buf.push("       <reason> from <filename>");
		var maxTime = 0;
		Object.keys(stats.fileModules).forEach(function(file) {
			stats.fileModules[file].forEach(function(module) {
				if(!module.profile) return;
				var time = module.profile.time - module.profile.timeChildren;
				if(maxTime < time) maxTime = time;
			});
		});
		var middleTime = maxTime * 0.7;
		maxTime *= 0.9;
		Object.keys(stats.fileModules).forEach(function(file) {
			buf.push(c("\033[1m\033[32m") + file + c("\033[39m\033[22m"));
			var modules = stats.fileModules[file];
			if(options["by-size"]) {
				modules.sort(function(a, b) {
					return b.size - a.size;
				});
			}
			modules.forEach(function(module) {
				var moduleLine = "  "+(module.fromCache?"":c("\033[1m")) + sprintf("%3s", module.id+"") + " " + (typeof module.size === "number" ? sprintf("%9s", Math.round(module.size)+"") : "         ") + "  " +
					(compressFilename(module.filename) ||
					(module.dirname && ("[context] " + compressFilename(module.dirname))) ||
					"[unknown]") + (module.fromCache?"":c("\033[22m"))
				if(module.fromCache) moduleLine += c("\033[1m\033[32m") + " [from cache]" + c("\033[39m\033[22m");
				else if(module.toCache) moduleLine += c("\033[1m\033[33m") + " [caching]" + c("\033[39m\033[22m");
				if(module.seperate) moduleLine += " [seperate]";
				if(module.profile) {
					var valueTime = module.profile.time - module.profile.timeChildren;
					if(valueTime > maxTime) moduleLine += c("\033[1m\033[31m");
					else if(valueTime > middleTime) moduleLine += c("\033[1m\033[33m");
					moduleLine += " [" + module.profile.time + "ms: " + (module.profile.timeResolve + module.profile.timeResolvePrePostLoaders) + "ms resolving, " + module.profile.timeBuildWaiting + "ms waiting" + ", " + module.profile.timeBuildModule + "ms build" + ", " + module.profile.timeChildren + "ms children]";
					if(valueTime > middleTime) moduleLine += c("\033[39m\033[22m");
				}
				buf.push(moduleLine);
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
							buf.push("       "+c("\033[35ma")+"async context from " + compressFilename(reason.filename) + c("\033[39m"));
							break;
						default:
							buf.push("       "+c("\033[31m") + reason.type + c("\033[39m"));
						}
					});
				}
			});
		});
	}
	if(stats.subStats.length > 0) {
		buf.push("Embedded Stats");
		stats.subStats.forEach(function(stats) {
			buf.push(" "+c("\033[1m") + compressFilename(stats.request) + c("\033[22m"));
			var subFormat = module.exports(stats, options).split(/\n/g).join("\n     ");
			buf.push("     "+subFormat);
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