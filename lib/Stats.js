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
	if(typeof options === "boolean" || typeof options === "string") {
		options = Stats.presetToOptions(options);
	} else if(!options) {
		options = {};
	}

	function d(v, def) {
		return v === undefined ? def : v;
	}
	var compilation = this.compilation;
	var requestShortener = new RequestShortener(d(options.context, process.cwd()));
	var showHash = d(options.hash, true);
	var showVersion = d(options.version, true);
	var showTimings = d(options.timings, true);
	var showAssets = d(options.assets, true);
	var showEntrypoints = d(options.entrypoints, !forToString);
	var showChunks = d(options.chunks, true);
	var showChunkModules = d(options.chunkModules, !!forToString);
	var showChunkOrigins = d(options.chunkOrigins, !forToString);
	var showModules = d(options.modules, !forToString);
	var showCachedModules = d(options.cached, true);
	var showCachedAssets = d(options.cachedAssets, true);
	var showReasons = d(options.reasons, !forToString);
	var showUsedExports = d(options.usedExports, !forToString);
	var showChildren = d(options.children, true);
	var showSource = d(options.source, !forToString);
	var showErrors = d(options.errors, true);
	var showErrorDetails = d(options.errorDetails, !forToString);
	var showWarnings = d(options.warnings, true);
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
		if(!field) return function() {
			return 0;
		};
		if(field[0] === "!") {
			field = field.substr(1);
			return function(a, b) {
				if(a[field] === b[field]) return 0;
				return a[field] < b[field] ? 1 : -1;
			};
		}
		return function(a, b) {
			if(a[field] === b[field]) return 0;
			return a[field] < b[field] ? -1 : 1;
		};
	}

	function formatError(e) {
		var text = "";
		if(typeof e === "string")
			e = {
				message: e
			};
		if(e.chunk) {
			text += "chunk " + (e.chunk.name || e.chunk.id) +
				(e.chunk.hasRuntime() ? " [entry]" : e.chunk.isInitial() ? " [initial]" : "") + "\n";
		}
		if(e.file) {
			text += e.file + "\n";
		}
		if(e.module && e.module.readableIdentifier && typeof e.module.readableIdentifier === "function") {
			text += e.module.readableIdentifier(requestShortener) + "\n";
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
			var current = e.origin;
			while(current.issuer) {
				current = current.issuer;
				text += "\n @ " + current.readableIdentifier(requestShortener);
			}
		}
		return text;
	}

	var obj = {
		errors: compilation.errors.map(formatError),
		warnings: compilation.warnings.map(formatError)
	};

	//We just hint other renderers since actually omitting
	//errors/warnings from the JSON would be kind of weird.
	Object.defineProperty(obj, "_showWarnings", {
		value: showWarnings,
		enumerable: false
	});
	Object.defineProperty(obj, "_showErrors", {
		value: showErrors,
		enumerable: false
	});

	if(showVersion) {
		obj.version = require("../package.json").version;
	}

	if(showHash) obj.hash = this.hash;
	if(showTimings && this.startTime && this.endTime) {
		obj.time = this.endTime - this.startTime;
	}
	if(compilation.needAdditionalPass) {
		obj.needAdditionalPass = true;
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

	if(showEntrypoints) {
		obj.entrypoints = {};
		Object.keys(compilation.entrypoints).forEach(function(name) {
			var ep = compilation.entrypoints[name];
			obj.entrypoints[name] = {
				chunks: ep.chunks.map(function(c) {
					return c.id;
				}),
				assets: ep.chunks.reduce(function(array, c) {
					return array.concat(c.files || []);
				}, [])
			}
		});
	}

	function fnModule(module) {
		var obj = {
			id: module.id,
			identifier: module.identifier(),
			name: module.readableIdentifier(requestShortener),
			index: module.index,
			index2: module.index2,
			size: module.size(),
			cacheable: !!module.cacheable,
			built: !!module.built,
			optional: !!module.optional,
			prefetched: !!module.prefetched,
			chunks: module.chunks.map(function(chunk) {
				return chunk.id;
			}),
			assets: Object.keys(module.assets || {}),
			issuer: module.issuer && module.issuer.identifier(),
			issuerId: module.issuer && module.issuer.id,
			issuerName: module.issuer && module.issuer.readableIdentifier(requestShortener),
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
				if(dep.templateModules) obj.templateModules = dep.templateModules.map(function(module) {
					return module.id;
				});
				if(typeof dep.loc === "object") obj.loc = dep.loc.start.line + ":" + dep.loc.start.column + "-" +
					(dep.loc.start.line !== dep.loc.end.line ? dep.loc.end.line + ":" : "") + dep.loc.end.column;
				return obj;
			}).sort(function(a, b) {
				return a.moduleId - b.moduleId;
			});
		}
		if(showUsedExports) {
			obj.usedExports = module.used ? module.usedExports : false;
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
				initial: chunk.isInitial(),
				entry: chunk.hasRuntime(),
				recorded: chunk.recorded,
				extraAsync: !!chunk.extraAsync,
				size: chunk.modules.reduce(function(size, module) {
					return size + module.size();
				}, 0),
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
	if(typeof options === "boolean" || typeof options === "string") {
		options = Stats.presetToOptions(options);
	} else if(!options) options = {};

	function d(v, def) {
		return v === undefined ? def : v;
	}
	var useColors = d(options.colors, false);

	var obj = this.toJson(options, true);

	return Stats.jsonToString(obj, useColors);
};

Stats.jsonToString = function jsonToString(obj, useColors) {
	var buf = [];

	var defaultColors = {
		bold: "\u001b[1m",
		yellow: "\u001b[1m\u001b[33m",
		red: "\u001b[1m\u001b[31m",
		green: "\u001b[1m\u001b[32m",
		cyan: "\u001b[1m\u001b[36m",
		magenta: "\u001b[1m\u001b[35m"
	};

	var colors = Object.keys(defaultColors).reduce(function(obj, color) {
		obj[color] = function(str) {
			if(useColors) {
				buf.push(
					(useColors === true || useColors[color] === undefined) ?
					defaultColors[color] : useColors[color]
				);
			}
			buf.push(str);
			if(useColors) {
				buf.push("\u001b[39m\u001b[22m");
			}
		};
		return obj;
	}, {
		normal: function(str) {
			buf.push(str);
		}
	});

	function coloredTime(time) {
		var times = [800, 400, 200, 100];
		if(obj.time) {
			times = [obj.time / 2, obj.time / 4, obj.time / 8, obj.time / 16];
		}
		if(time < times[3])
			colors.normal(time + "ms");
		else if(time < times[2])
			colors.bold(time + "ms");
		else if(time < times[1])
			colors.green(time + "ms");
		else if(time < times[0])
			colors.yellow(time + "ms");
		else
			colors.red(time + "ms");
	}

	function newline() {
		buf.push("\n");
	}

	function table(array, formats, align, splitter) {
		var row;
		var rows = array.length;
		var col;
		var cols = array[0].length;
		var colSizes = new Array(cols);
		var value;
		for(col = 0; col < cols; col++)
			colSizes[col] = 3;
		for(row = 0; row < rows; row++) {
			for(col = 0; col < cols; col++) {
				value = array[row][col] + "";
				if(value.length > colSizes[col]) {
					colSizes[col] = value.length;
				}
			}
		}
		for(row = 0; row < rows; row++) {
			for(col = 0; col < cols; col++) {
				var format = row === 0 ? colors.bold : formats[col];
				value = array[row][col] + "";
				var l = value.length;
				if(align[col] === "l")
					format(value);
				for(; l < colSizes[col] && col !== cols - 1; l++)
					colors.normal(" ");
				if(align[col] === "r")
					format(value);
				if(col + 1 < cols)
					colors.normal(splitter || "  ");
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
		colors.normal("Hash: ");
		colors.bold(obj.hash);
		newline();
	}
	if(obj.version) {
		colors.normal("Version: webpack ");
		colors.bold(obj.version);
		newline();
	}
	if(typeof obj.time === "number") {
		colors.normal("Time: ");
		colors.bold(obj.time);
		colors.normal("ms");
		newline();
	}
	if(obj.publicPath) {
		colors.normal("PublicPath: ");
		colors.bold(obj.publicPath);
		newline();
	}
	if(obj.assets && obj.assets.length > 0) {
		var t = [
			["Asset", "Size", "Chunks", "", "Chunk Names"]
		];
		obj.assets.forEach(function(asset) {
			t.push([
				asset.name,
				formatSize(asset.size),
				asset.chunks.join(", "),
				asset.emitted ? "[emitted]" : "",
				asset.chunkNames.join(", ")
			]);
		});
		table(t, [colors.green, colors.normal, colors.bold, colors.green, colors.normal], "rrrll");
	}
	if(obj.entrypoints) {
		Object.keys(obj.entrypoints).forEach(function(name) {
			colors.normal("Entrypoint ");
			colors.bold(name);
			colors.normal(" =");
			obj.entrypoints[name].assets.forEach(function(asset) {
				colors.normal(" ");
				colors.green(asset);
			});
			newline();
		});
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
			colors.normal("      ");
			var sum = 0;
			var path = [];
			var current = module;
			while(current.issuer) {
				path.unshift(current = current.issuer);
			}
			path.forEach(function(module) {
				colors.normal(" [");
				colors.normal(module.id);
				colors.normal("] ");
				if(module.profile) {
					var time = (module.profile.factory || 0) + (module.profile.building || 0);
					coloredTime(time);
					sum += time;
					colors.normal(" ");
				}
				colors.normal("->");
			});
			Object.keys(module.profile).forEach(function(key) {
				colors.normal(" " + key + ":");
				var time = module.profile[key];
				coloredTime(time);
				sum += time;
			});
			colors.normal(" = ");
			coloredTime(sum);
			newline();
		}
	}

	function processModuleAttributes(module) {
		colors.normal(" ");
		colors.normal(formatSize(module.size));
		if(module.chunks) {
			module.chunks.forEach(function(chunk) {
				colors.normal(" {");
				colors.yellow(chunk);
				colors.normal("}");
			});
		}
		if(!module.cacheable) {
			colors.red(" [not cacheable]");
		}
		if(module.optional) {
			colors.yellow(" [optional]");
		}
		if(module.built) {
			colors.green(" [built]");
		}
		if(module.prefetched) {
			colors.magenta(" [prefetched]");
		}
		if(module.failed)
			colors.red(" [failed]");
		if(module.warnings)
			colors.yellow(" [" + module.warnings + " warning" + (module.warnings === 1 ? "" : "s") + "]");
		if(module.errors)
			colors.red(" [" + module.errors + " error" + (module.errors === 1 ? "" : "s") + "]");
	}
	if(obj.chunks) {
		obj.chunks.forEach(function(chunk) {
			colors.normal("chunk ");
			if(chunk.id < 1000) colors.normal(" ");
			if(chunk.id < 100) colors.normal(" ");
			if(chunk.id < 10) colors.normal(" ");
			colors.normal("{");
			colors.yellow(chunk.id);
			colors.normal("} ");
			colors.green(chunk.files.join(", "));
			if(chunk.names && chunk.names.length > 0) {
				colors.normal(" (");
				colors.normal(chunk.names.join(", "));
				colors.normal(")");
			}
			colors.normal(" ");
			colors.normal(formatSize(chunk.size));
			chunk.parents.forEach(function(id) {
				colors.normal(" {");
				colors.yellow(id);
				colors.normal("}");
			});
			if(chunk.entry) {
				colors.yellow(" [entry]");
			} else if(chunk.initial) {
				colors.yellow(" [initial]");
			}
			if(chunk.rendered) {
				colors.green(" [rendered]");
			}
			if(chunk.recorded) {
				colors.green(" [recorded]");
			}
			newline();
			if(chunk.origins) {
				chunk.origins.forEach(function(origin) {
					colors.normal("    > ");
					if(origin.reasons && origin.reasons.length) {
						colors.yellow(origin.reasons.join(" "));
						colors.normal(" ");
					}
					if(origin.name) {
						colors.normal(origin.name);
						colors.normal(" ");
					}
					if(origin.module) {
						colors.normal("[");
						colors.normal(origin.moduleId);
						colors.normal("] ");
						var module = modulesByIdentifier["$" + origin.module];
						if(module) {
							colors.bold(module.name);
							colors.normal(" ");
						}
						if(origin.loc) {
							colors.normal(origin.loc);
						}
					}
					newline();
				});
			}
			if(chunk.modules) {
				chunk.modules.forEach(function(module) {
					colors.normal(" ");
					if(module.id < 1000) colors.normal(" ");
					if(module.id < 100) colors.normal(" ");
					if(module.id < 10) colors.normal(" ");
					colors.normal("[");
					colors.normal(module.id);
					colors.normal("] ");
					colors.bold(module.name);
					processModuleAttributes(module);
					newline();
					if(module.usedExports !== undefined) {
						if(module.usedExports !== true) {
							colors.normal("        ");
							if(module.usedExports === false)
								colors.cyan("[no exports used]");
							else
								colors.cyan("[only some exports used: " + module.usedExports.join(", ") + "]");
							newline();
						}
					}
					if(module.reasons) {
						module.reasons.forEach(function(reason) {
							colors.normal("        ");
							colors.normal(reason.type);
							colors.normal(" ");
							colors.cyan(reason.userRequest);
							if(reason.templateModules) colors.cyan(reason.templateModules.join(" "));
							colors.normal(" [");
							colors.normal(reason.moduleId);
							colors.normal("] ");
							colors.magenta(reason.module);
							if(reason.loc) {
								colors.normal(" ");
								colors.normal(reason.loc);
							}
							newline();
						});
					}
					processProfile(module);
				});
				if(chunk.filteredModules > 0) {
					colors.normal("     + " + chunk.filteredModules + " hidden modules");
					newline();
				}
			}
		});
	}
	if(obj.modules) {
		obj.modules.forEach(function(module) {
			if(module.id < 1000) colors.normal(" ");
			if(module.id < 100) colors.normal(" ");
			if(module.id < 10) colors.normal(" ");
			colors.normal("[");
			colors.normal(module.id);
			colors.normal("] ");
			colors.bold(module.name || module.identifier);
			processModuleAttributes(module);
			newline();
			if(module.usedExports !== undefined) {
				if(module.usedExports !== true) {
					colors.normal("       ");
					if(module.usedExports === false)
						colors.cyan("[no exports used]");
					else
						colors.cyan("[only some exports used: " + module.usedExports.join(", ") + "]");
					newline();
				}
			}
			if(module.reasons) {
				module.reasons.forEach(function(reason) {
					colors.normal("       ");
					colors.normal(reason.type);
					colors.normal(" ");
					colors.cyan(reason.userRequest);
					if(reason.templateModules) colors.cyan(reason.templateModules.join(" "));
					colors.normal(" [");
					colors.normal(reason.moduleId);
					colors.normal("] ");
					colors.magenta(reason.module);
					if(reason.loc) {
						colors.normal(" ");
						colors.normal(reason.loc);
					}
					newline();
				});
			}
			processProfile(module);
		});
		if(obj.filteredModules > 0) {
			colors.normal("    + " + obj.filteredModules + " hidden modules");
			newline();
		}
	}
	if(obj._showWarnings && obj.warnings) {
		obj.warnings.forEach(function(warning) {
			newline();
			colors.yellow("WARNING in " + warning);
			newline();
		});
	}
	if(obj._showErrors && obj.errors) {
		obj.errors.forEach(function(error) {
			newline();
			colors.red("ERROR in " + error);
			newline();
		});
	}
	if(obj.children) {
		obj.children.forEach(function(child) {
			if(child.name) {
				colors.normal("Child ");
				colors.bold(child.name);
				colors.normal(":");
			} else {
				colors.normal("Child");
			}
			newline();
			buf.push("    ");
			buf.push(Stats.jsonToString(child, useColors).replace(/\n/g, "\n    "));
			newline();
		});
	}
	if(obj.needAdditionalPass) {
		colors.yellow("Compilation needs an additional pass and will compile again.");
	}

	while(buf[buf.length - 1] === "\n") buf.pop();
	return buf.join("");
};

Stats.presetToOptions = function(name) {
	//Accepted values: none, errors-only, minimal, normal, verbose
	//Any other falsy value will behave as 'none', truthy values as 'normal'
	var pn = (typeof name === "string") && name.toLowerCase() || name;
	if(pn === "none" || !pn) {
		return {
			hash: false,
			version: false,
			timings: false,
			assets: false,
			entrypoints: false,
			chunks: false,
			modules: false,
			reasons: false,
			usedExports: false,
			children: false,
			source: false,
			errors: false,
			errorDetails: false,
			warnings: false,
			publicPath: false
		};
	} else {
		return {
			hash: pn !== "errors-only" && pn !== "minimal",
			version: pn === "verbose",
			timings: pn !== "errors-only" && pn !== "minimal",
			assets: pn === "verbose",
			entrypoints: pn === "verbose",
			chunks: pn !== "errors-only",
			chunkModules: pn === "verbose",
			//warnings: pn !== "errors-only",
			errorDetails: pn !== "errors-only" && pn !== "minimal",
			reasons: pn === "verbose",
			usedExports: pn === "verbose",
			colors: true
		};
	}
};
