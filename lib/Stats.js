/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequestShortener = require("./RequestShortener");

function Stats(compilation) {
	this.compilation = compilation;
	this.hash = compilation.hash;
}
module.exports = Stats;

Stats.prototype.hasWarnings = function() {
	return this.compilation.warnings.length > 0;
};

Stats.prototype.hasErrors = function() {
	return this.compilation.errors.length > 0;
};

Stats.prototype.toJson = function toJson(options, forToString) {
	if(!options) options = {};
	function d(v, def) { return v === undefined ? def : v; }
	var compilation = this.compilation;
	var requestShortener = new RequestShortener(d(options.context, process.cwd()));
	var showHash = d(options.hash, true);
	var showVersion = d(options.version, true);
	var showTimings = d(options.timings, true);
	var showAssets = d(options.assets, true);
	var showChunks = d(options.chunks, true);
	var showChunkModules = d(options.chunkModules, !!forToString);
	var showChunkOrigins = d(options.chunkOrigins, !forToString);
	var showModules = d(options.modules, !forToString);
	var showCachedModules = d(options.cached, true);
	var showCachedAssets = d(options.cachedAssets, true);
	var showReasons = d(options.reasons, !forToString);
	var showChildren = d(options.children, true);
	var showSource = d(options.source, !forToString);
	var showErrorDetails = d(options.errorDetails, !forToString);
	var showPublicPath = d(options.publicPath, !forToString);
	var excludeModules = [].concat(d(options.exclude, [])).map(function(str) {
		if(typeof str !== "string") return str;
		return new RegExp("[\\\\/]" + str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "([\\\\/]|$|!|\\?)");
	});
	var sortModules = d(options.modulesSort, "id");
	var sortChunks = d(options.chunksSort, "id");
	var sortAssets = d(options.assetsSort, "");

	function moduleFilter(module) {
		if(!showCachedModules && !module.built) {
			return false;
		}
		if(excludeModules.length === 0)
			return true;
		var ident = module.identifier();
		return !excludeModules.some(function(regExp) {
			return regExp.test(ident);
		});
	}

	function sortByField(field) {
		if(!field) return function() { return 0; };
		if(field[0] === "!") {
			field = field.substr(1);
			return function(a, b) {
				if(a[field] === b[field]) return 0;
				return (a[field] < b[field]) ? 1 : -1;
			};
		}
		return function(a, b) {
			if(a[field] === b[field]) return 0;
			return (a[field] < b[field]) ? -1 : 1;
		};
	}
	function formatError(e) {
		var text = "";
		if(e.module && e.module.readableIdentifier && typeof e.module.readableIdentifier === "function") {
			text += e.module.readableIdentifier(requestShortener) + "\n";
		} else if(e.file) {
			text += e.file + "\n";
		}
		text += e.message;
		if(showErrorDetails && e.details) text += "\n" + e.details;
		if(showErrorDetails && e.missing) text += e.missing.map(function(item) {
			return "\n[" + item + "]";
		}).join("");
		if(e.dependencies && e.origin) {
			text += "\n @ " + e.origin.readableIdentifier(requestShortener);
			e.dependencies.forEach(function(dep) {
				if(!dep.loc) return;
				if(typeof dep.loc === "string") return;
				if(!dep.loc.start) return;
				if(!dep.loc.end) return;
				text += " " + dep.loc.start.line + ":" + dep.loc.start.column + "-" +
					(dep.loc.start.line !== dep.loc.end.line ? dep.loc.end.line + ":" : "") + dep.loc.end.column;
			});
		}
		return text;
	}
	var obj = {
		errors: compilation.errors.map(formatError),
		warnings: compilation.warnings.map(formatError)
	};

	if(showVersion) {
		obj.version = require("../package.json").version;
	}

	if(showHash) obj.hash = this.hash;
	if(showTimings && this.startTime && this.endTime) {
		obj.time = this.endTime - this.startTime;
	}
	if(showPublicPath) {
		obj.publicPath = this.compilation.mainTemplate.getPublicPath({
			hash: this.compilation.hash
		});
	}
	if(showAssets) {
		var assetsByFile = {};
		obj.assetsByChunkName = {};
		obj.assets = Object.keys(compilation.assets).map(function(asset) {
			var obj = {
				name: asset,
				size: compilation.assets[asset].size(),
				chunks: [],
				chunkNames: [],
				emitted: compilation.assets[asset].emitted
			};
			assetsByFile[asset] = obj;
			return obj;
		}).filter(function(asset) {
			return showCachedAssets || asset.emitted;
		});
		compilation.chunks.forEach(function(chunk) {
			chunk.files.forEach(function(asset) {
				if(assetsByFile[asset]) {
					chunk.ids.forEach(function(id) {
						assetsByFile[asset].chunks.push(id);
					});
					if(chunk.name) {
						assetsByFile[asset].chunkNames.push(chunk.name);
						if(obj.assetsByChunkName[chunk.name])
							obj.assetsByChunkName[chunk.name] = [].concat(obj.assetsByChunkName[chunk.name]).concat([asset]);
						else
							obj.assetsByChunkName[chunk.name] = asset;
					}
				}
			});
		});
		obj.assets.sort(sortByField(sortAssets));
	}
	function fnModule(module) {
		var obj = {
			id: module.id,
			identifier: module.identifier(),
			name: module.readableIdentifier(requestShortener),
			size: module.size(),
			cacheable: !!module.cacheable,
			built: !!module.built,
			optional: !!module.optional,
			prefetched: !!module.prefetched,
			chunks: module.chunks.map(function(chunk) {
				return chunk.id;
			}),
			assets: Object.keys(module.assets || {}),
			issuer: module.issuer,
			profile: module.profile,
			failed: !!module.error,
			errors: module.errors && module.dependenciesErrors && (module.errors.length + module.dependenciesErrors.length),
			warnings: module.errors && module.dependenciesErrors && (module.warnings.length + module.dependenciesWarnings.length)
		};
		if(showReasons) {
			obj.reasons = module.reasons.filter(function(reason) {
				return reason.dependency && reason.module;
			}).map(function(reason) {
				var obj = {
					moduleId: reason.module.id,
					moduleIdentifier: reason.module.identifier(),
					module: reason.module.readableIdentifier(requestShortener),
					moduleName: reason.module.readableIdentifier(requestShortener),
					type: reason.dependency.type,
					userRequest: reason.dependency.userRequest
				};
				var dep = reason.dependency;
				if(dep.templateModules) obj.templateModules = dep.templateModules.map(function(module) { return module.id; });
				if(typeof dep.loc === "object") obj.loc = dep.loc.start.line + ":" + dep.loc.start.column + "-" +
					(dep.loc.start.line !== dep.loc.end.line ? dep.loc.end.line + ":" : "") + dep.loc.end.column;
				return obj;
			}).sort(function(a, b) {
				return a.moduleId - b.moduleId;
			});
		}
		if(showSource && module._source) {
			obj.source = module._source.source();
		}
		return obj;
	}
	if(showChunks) {
		obj.chunks = compilation.chunks.map(function(chunk) {
			var obj = {
				id: chunk.id,
				rendered: chunk.rendered,
				initial: !!chunk.initial,
				entry: !!chunk.entry,
				extraAsync: !!chunk.extraAsync,
				size: chunk.modules.reduce(function(size, module) { return size + module.size(); }, 0),
				names: chunk.name ? [chunk.name] : [],
				files: chunk.files.slice(),
				hash: chunk.renderedHash,
				parents: chunk.parents.map(function(c) {
					return c.id;
				})
			};
			if(showChunkModules) {
				obj.modules = chunk.modules.filter(moduleFilter).map(fnModule);
				obj.filteredModules = chunk.modules.length - obj.modules.length;
				obj.modules.sort(sortByField(sortModules));
			}
			if(showChunkOrigins) {
				obj.origins = chunk.origins.map(function(origin) {
					return {
						moduleId: origin.module ? origin.module.id : undefined,
						module: origin.module ? origin.module.identifier() : "",
						moduleIdentifier: origin.module ? origin.module.identifier() : "",
						moduleName: origin.module ? origin.module.readableIdentifier(requestShortener) : "",
						loc: typeof origin.loc === "object" ? obj.loc = origin.loc.start.line + ":" + origin.loc.start.column + "-" +
							(origin.loc.start.line !== origin.loc.end.line ? origin.loc.end.line + ":" : "") + origin.loc.end.column : "",
						name: origin.name,
						reasons: origin.reasons || []
					};
				});
			}
			return obj;
		});
		obj.chunks.sort(sortByField(sortChunks));
	}
	if(showModules) {
		obj.modules = compilation.modules.filter(moduleFilter).map(fnModule);
		obj.filteredModules = compilation.modules.length - obj.modules.length;
		obj.modules.sort(sortByField(sortModules));
	}
	if(showChildren) {
		obj.children = compilation.children.map(function(child) {
			var obj = new Stats(child).toJson(options, forToString);
			delete obj.hash;
			delete obj.version;
			obj.name = child.name;
			return obj;
		});
	}
	return obj;
};

Stats.prototype.toString = function toString(options) {
	if(!options) options = {};
	function d(v, def) { return v === undefined ? def : v; }
	var useColors = d(options.colors, false);

	var obj = this.toJson(options, true);

	return Stats.jsonToString(obj, useColors);
};

Stats.jsonToString = function jsonToString(obj, useColors) {
	var buf = [];
	function normal(str) {
		buf.push(str);
	}
	function bold(str) {
		if(useColors) buf.push("\u001b[1m");
		buf.push(str);
		if(useColors) buf.push("\u001b[22m");
	}
	function yellow(str) {
		if(useColors) buf.push("\u001b[1m\u001b[33m");
		buf.push(str);
		if(useColors) buf.push("\u001b[39m\u001b[22m");
	}
	function red(str) {
		if(useColors) buf.push("\u001b[1m\u001b[31m");
		buf.push(str);
		if(useColors) buf.push("\u001b[39m\u001b[22m");
	}
	function green(str) {
		if(useColors) buf.push("\u001b[1m\u001b[32m");
		buf.push(str);
		if(useColors) buf.push("\u001b[39m\u001b[22m");
	}
	function cyan(str) {
		if(useColors) buf.push("\u001b[1m\u001b[36m");
		buf.push(str);
		if(useColors) buf.push("\u001b[39m\u001b[22m");
	}
	function magenta(str) {
		if(useColors) buf.push("\u001b[1m\u001b[35m");
		buf.push(str);
		if(useColors) buf.push("\u001b[39m\u001b[22m");
	}
	function coloredTime(time) {
		var times = [800, 400, 200, 100];
		if(obj.time) {
			times = [obj.time / 2, obj.time / 4, obj.time / 8, obj.time / 16];
		}
		if(time < times[3])
			normal(time + "ms");
		else if(time < times[2])
			bold(time + "ms");
		else if(time < times[1])
			green(time + "ms");
		else if(time < times[0])
			yellow(time + "ms");
		else
			red(time + "ms");
	}
	function newline() {
		buf.push("\n");
	}
	function table(array, formats, align, splitter) {
		var rows = array.length;
		var cols = array[0].length;
		var colSizes = new Array(cols);
		for(var col = 0; col < cols; col++)
			colSizes[col] = 3;
		for(var row = 0; row < rows; row++) {
			for(var col = 0; col < cols; col++) {
				var value = array[row][col] + "";
				if(value.length > colSizes[col]) {
					colSizes[col] = value.length;
				}
			}
		}
		for(var row = 0; row < rows; row++) {
			for(var col = 0; col < cols; col++) {
				var format = row === 0 ? bold : formats[col];
				var value = array[row][col] + "";
				var l = value.length;
				if(align[col] === "l")
					format(value);
				for(; l < colSizes[col] && col !== cols - 1; l++)
					normal(" ");
				if(align[col] === "r")
					format(value);
				if(col + 1 < cols)
					normal(splitter || "  ");
			}
			newline();
		}
	}
	function formatSize(size) {
		if(size <= 0) return "0 bytes";

		var abbreviations = ["bytes", "kB", "MB", "GB"];
		var index = Math.floor(Math.log(size) / Math.log(1000));

		return +(size / Math.pow(1000, index))
			.toPrecision(3) + " " + abbreviations[index];
	}

	if(obj.hash) {
		normal("Hash: ");
		bold(obj.hash);
		newline();
	}
	if(obj.version) {
		normal("Version: webpack ");
		bold(obj.version);
		newline();
	}
	if(obj.time) {
		normal("Time: ");
		bold(obj.time);
		normal("ms");
		newline();
	}
	if(obj.publicPath) {
		normal("PublicPath: ");
		bold(obj.publicPath);
		newline();
	}
	if(obj.assets && obj.assets.length > 0) {
		var t = [["Asset", "Size", "Chunks", "", "Chunk Names"]];
		obj.assets.forEach(function(asset) {
			t.push([
				asset.name,
				formatSize(asset.size),
				asset.chunks.join(", "),
				asset.emitted ? "[emitted]" : "",
				asset.chunkNames.join(", ")
			]);
		});
		table(t, [green, normal, bold, green, normal], "rrrll");
	}
	var modulesByIdentifier = {};
	if(obj.modules) {
		obj.modules.forEach(function(module) {
			modulesByIdentifier["$" + module.identifier] = module;
		});
	} else if(obj.chunks) {
		obj.chunks.forEach(function(chunk) {
			if(chunk.modules) {
				chunk.modules.forEach(function(module) {
					modulesByIdentifier["$" + module.identifier] = module;
				});
			}
		});
	}
	function processProfile(module) {
		if(module.profile) {
			normal("      ");
			var sum = 0, allowSum = true;
			var path = [];
			var current = module;
			while(current.issuer) {
				if(!modulesByIdentifier["$" + current.issuer]) {
					normal(" ... ->");
					allowSum = false;
					break;
				}
				path.unshift(current = modulesByIdentifier["$" + current.issuer]);
			}
			path.forEach(function(module) {
				normal(" [");
				normal(module.id);
				normal("] ");
				if(module.profile) {
					var time = (module.profile.factory || 0) + (module.profile.building || 0);
					coloredTime(time);
					sum += time;
					normal(" ");
				}
				normal("->");
			});
			Object.keys(module.profile).forEach(function(key) {
				normal(" " + key + ":");
				var time = module.profile[key];
				coloredTime(time);
				sum += time;
			});
			if(allowSum) {
				normal(" = ");
				coloredTime(sum);
			}
			newline();
		}
	}
	function processModuleAttributes(module) {
		normal(" ");
		normal(formatSize(module.size));
		if(module.chunks) {
			module.chunks.forEach(function(chunk) {
				normal(" {");
				yellow(chunk);
				normal("}");
			});
		}
		if(!module.cacheable) {
			red(" [not cacheable]");
		}
		if(module.optional) {
			yellow(" [optional]");
		}
		if(module.built) {
			green(" [built]");
		}
		if(module.prefetched) {
			magenta(" [prefetched]");
		}
		if(module.failed)
			red(" [failed]");
		if(module.warnings)
			yellow(" [" + module.warnings + " warning" + (module.warnings === 1 ? "" : "s") + "]");
		if(module.errors)
			red(" [" + module.errors + " error" + (module.errors === 1 ? "" : "s") + "]");
	}
	if(obj.chunks) {
		obj.chunks.forEach(function(chunk) {
			normal("chunk ");
			if(chunk.id < 1000) normal(" ");
			if(chunk.id < 100) normal(" ");
			if(chunk.id < 10) normal(" ");
			normal("{");
			yellow(chunk.id);
			normal("} ");
			green(chunk.files.join(", "));
			if(chunk.names && chunk.names.length > 0) {
				normal(" (");
				normal(chunk.names.join(", "));
				normal(")");
			}
			normal(" ");
			normal(formatSize(chunk.size));
			chunk.parents.forEach(function(id) {
				normal(" {");
				yellow(id);
				normal("}");
			});
			if(chunk.rendered) {
				green(" [rendered]");
			}
			newline();
			if(chunk.origins) {
				chunk.origins.forEach(function(origin) {
					normal("    > ");
					if(origin.reasons && origin.reasons.length) {
						yellow(origin.reasons.join(" "));
						normal(" ");
					}
					if(origin.name) {
						normal(origin.name);
						normal(" ");
					}
					if(origin.module) {
						normal("[");
						normal(origin.moduleId);
						normal("] ");
						var module = modulesByIdentifier["$" + origin.module];
						if(module) {
							bold(module.name);
							normal(" ");
						}
						if(origin.loc) {
							normal(origin.loc);
						}
					}
					newline();
				});
			}
			if(chunk.modules) {
				chunk.modules.forEach(function(module) {
					normal(" ");
					if(module.id < 1000) normal(" ");
					if(module.id < 100) normal(" ");
					if(module.id < 10) normal(" ");
					normal("[");
					normal(module.id);
					normal("] ");
					bold(module.name);
					processModuleAttributes(module);
					newline();
					if(module.reasons) {
						module.reasons.forEach(function(reason) {
							normal("        ");
							normal(reason.type);
							normal(" ");
							cyan(reason.userRequest);
							if(reason.templateModules) cyan(reason.templateModules.join(" "));
							normal(" [");
							normal(reason.moduleId);
							normal("] ");
							magenta(reason.module);
							if(reason.loc) {
								normal(" ");
								normal(reason.loc);
							}
							newline();
						});
					}
					processProfile(module);
				});
				if(chunk.filteredModules > 0) {
					normal("     + " + chunk.filteredModules + " hidden modules");
					newline();
				}
			}
		});
	}
	if(obj.modules) {
		obj.modules.forEach(function(module) {
			if(module.id < 1000) normal(" ");
			if(module.id < 100) normal(" ");
			if(module.id < 10) normal(" ");
			normal("[");
			normal(module.id);
			normal("] ");
			bold(module.name || module.identifier);
			processModuleAttributes(module);
			newline();
			if(module.reasons) {
				module.reasons.forEach(function(reason) {
					normal("       ");
					normal(reason.type);
					normal(" ");
					cyan(reason.userRequest);
					if(reason.templateModules) cyan(reason.templateModules.join(" "));
					normal(" [");
					normal(reason.moduleId);
					normal("] ");
					magenta(reason.module);
					if(reason.loc) {
						normal(" ");
						normal(reason.loc);
					}
					newline();
				});
			}
			processProfile(module);
		});
		if(obj.filteredModules > 0) {
			normal("    + " + obj.filteredModules + " hidden modules");
			newline();
		}
	}
	if(obj.warnings) {
		obj.warnings.forEach(function(warning) {
			newline();
			yellow("WARNING in " + warning);
			newline();
		});
	}
	if(obj.errors) {
		obj.errors.forEach(function(error) {
			newline();
			red("ERROR in " + error);
			newline();
		});
	}
	if(obj.children) {
		obj.children.forEach(function(child) {
			if(child.name) {
				normal("Child ");
				bold(child.name);
				normal(":");
			} else {
				normal("Child");
			}
			newline();
			buf.push("    ");
			buf.push(Stats.jsonToString(child, useColors).replace(/\n/g, "\n    "));
			newline();
		});
	}

	while(buf[buf.length - 1] === "\n") buf.pop();
	return buf.join("");
};
