/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
module.exports = function(module, options, toRealId, toRealChuckId) {
	var result;
	if(typeof module.source !== "string") {
		// if no source is avalible, try to generate it
		if(module.requireMap) { // with a require map
			var extensions = ((options.resolve && options.resolve.extensions) || ["", ".web.js", ".js"]).slice();
			var realRequireMap = {};
			var usedExtensions = [];
			Object.keys(module.requireMap).sort().forEach(function(file) {
				var realId = toRealId(module.requireMap[file]);
				if(!realId) realId = realId + ""; // not cause a bug if realId === 0
				realRequireMap[file] = realId;
				for(var i = 0; i < extensions.length; i++) {
					var ext = extensions[i]
					var idx = file.lastIndexOf(ext);
					if(idx >= 0 && idx === file.length - ext.length) {
						usedExtensions.push(ext);
						extensions.splice(i, 1);
						i--;
					}
				}
			});
			var extensionsAccess = [];
			usedExtensions.forEach(function(ext) {
				if(ext === "")
					extensionsAccess.push("map[name]");
				else
					extensionsAccess.push("map[name+" + JSON.stringify(ext) + "]");
			});

			result = "/***/\tvar map = " + JSON.stringify(realRequireMap) + ";\n" +
				"/***/\texports = module.exports = function(name) {\n" +
				"/***/\t\treturn require(exports.id(name) || name)\n" +
				"/***/\t};\n" +
				"/***/\texports.id = function(name) {\n" +
				"/***/\t\treturn " + extensionsAccess.join(" || ") + ";\n" +
				"/***/\t};\n" +
				"/***/\texports.keys = function() {\n" +
				"/***/\t\treturn Object.keys(map);\n" +
				"/***/\t};";
		} else
			return;
	} else {
		// take the original source and replace the names with ids
		// and inject free variables
		var freeVars = {};
		var replaces = []; // { from: 123, to: 125, value: "4" }
		var modulePrepends = [];
		var moduleAppends = [];
		var shortenFilename = function(f) { return f };
		if(module.dirname)
			shortenFilename = require("./createFilenameShortener")(module.dirname);
		if(module.filename)
			shortenFilename = require("./createFilenameShortener")(path.dirname(module.filename));
		function genReplaceRequire(requireItem) {
			if(requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
				var prefix = "";
				if(requireItem.name && options.includeFilenames)
					prefix += "/* " + shortenFilename(requireItem.name) + " */";
				if(requireItem.expressionRange) {
					replaces.push({
						from: requireItem.expressionRange[0],
						to: requireItem.expressionRange[1],
						value: (!requireItem.idOnly ? "require(" : requireItem.brackets ? "(" : "") +
							prefix + toRealId(requireItem.id) +
							(requireItem.idOnly && !requireItem.brackets ? "" : ")") +
							(requireItem.append || "")
					});
				} else if(requireItem.valueRange) {
					replaces.push({
						from: requireItem.valueRange[0],
						to: requireItem.valueRange[1],
						value: prefix + toRealId(requireItem.id)
					});
					if(requireItem.deleteRange) {
						replaces.push({
							from: requireItem.deleteRange[0],
							to: requireItem.deleteRange[1],
							value: ""
						});
					}
				} else if(requireItem.variable) {
					if(!freeVars[requireItem.variable]) {
						freeVars[requireItem.variable] = requireItem;
					}
				}
			} else if(requireItem.requireFunction) {
				replaces.push({
					from: requireItem.expressionRange[0],
					to: requireItem.expressionRange[1],
					value: "require"
				});
			} else if(requireItem.moduleExports) {
				replaces.push({
					from: requireItem.expressionRange[0],
					to: requireItem.expressionRange[1],
					value: "module.exports"
				});
			}
			if(requireItem.amdNameRange) {
				replaces.push({
					from: requireItem.amdNameRange[0],
					to: requireItem.amdNameRange[1],
					value: "/* "+ requireItem.label.replace(/\*\//g, "* nice try /") + " */0"
				});
			}
		}
		function genContextReplaces(contextItem) {
			var postfix = "";
			var prefix = "";
			if(contextItem.name)
				prefix += "/* " + contextItem.name + " */";
			if(contextItem.require) {
				replaces.push({
					from: contextItem.calleeRange[0],
					to: contextItem.calleeRange[1],
					value: "require(" + prefix + (((contextItem.id && toRealId(contextItem.id)) || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")"
				});
				if(contextItem.replace) {
					replaces.push({
						from: contextItem.replace[0][0],
						to: contextItem.replace[0][1],
						value: JSON.stringify(contextItem.replace[1])
					});
				}
			} else if(contextItem.valueRange) {
				replaces.push({
					from: contextItem.valueRange[1]+1,
					to: contextItem.valueRange[1],
					value: ")"
				});
				if(contextItem.replace &&
					contextItem.valueRange[0] == contextItem.replace[0][0]) {
					replaces.push({
						from: contextItem.replace[0][0],
						to: contextItem.replace[0][1],
						value: "require(" + prefix + (((contextItem.id && toRealId(contextItem.id)) || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")(" + JSON.stringify(contextItem.replace[1])
					});
				} else {
					replaces.push({
						from: contextItem.valueRange[0],
						to: contextItem.valueRange[0]-1,
						value: "require(" + prefix + (((contextItem.id && toRealId(contextItem.id)) || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")("
					});
					if(contextItem.replace) {
						replaces.push({
							from: contextItem.replace[0][0],
							to: contextItem.replace[0][1],
							value: JSON.stringify(contextItem.replace[1])
						});
					}
				}
			} else if(contextItem.expressionRange) {
				replaces.push({
					from: contextItem.expressionRange[0],
					to: contextItem.expressionRange[1],
					value: "(" + prefix + (((contextItem.id && toRealId(contextItem.id)) || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")" + postfix
				});
				if(contextItem.calleeRange) {
					replaces.push({
						from: contextItem.calleeRange[0],
						to: contextItem.calleeRange[1],
						value: "require"
					});
				}
			}
		}
		if(module.requires) {
			module.requires.forEach(genReplaceRequire);
		}
		if(module.contexts) {
			module.contexts.forEach(genContextReplaces);
		}
		if(module.asyncs) {
			module.asyncs.forEach(function genReplacesAsync(asyncItem) {
				var oldFreeVars = freeVars;
				freeVars = {};
				if(asyncItem.requires) {
					asyncItem.requires.forEach(genReplaceRequire);
				}
				if(asyncItem.asyncs) {
					asyncItem.asyncs.forEach(genReplacesAsync);
				}
				if(asyncItem.contexts) {
					asyncItem.contexts.forEach(genContextReplaces);
				}
				// commonjs
				if(asyncItem.namesRange) {
					replaces.push({
						from: asyncItem.namesRange[0],
						to: asyncItem.namesRange[1],
						value: ((asyncItem.chunkId && toRealChuckId(asyncItem.chunkId) || "0") + "")
					});
				}
				if(asyncItem.nameRange) {
					replaces.push({
						from: asyncItem.nameRange[0],
						to: asyncItem.nameRange[1],
						value: "/* "+ asyncItem.name.replace(/\*\//g, "* nice try /") + " */0"
					});
				}
				if(asyncItem.propertyRange) {
					replaces.push({
						from: asyncItem.propertyRange[0],
						to: asyncItem.propertyRange[1],
						value: "e"
					});
				}
				// amd
				if(asyncItem.amdRange) {
					replaces.push({
						from: asyncItem.amdRange[0],
						to: asyncItem.amdRange[0]-1,
						value: ((asyncItem.chunkId && toRealChuckId(asyncItem.chunkId) || "0") + "") + ", function() { return "
					});
					replaces.push({
						from: asyncItem.amdRange[1]+1,
						to: asyncItem.amdRange[1],
						value: "}"
					});
				}
				if(asyncItem.blockRange) {
					genReplacesFreeVars(asyncItem.blockRange, freeVars);
				}
				freeVars = oldFreeVars;
			});
		}
		function genReplacesFreeVars(blockRange, freeVars) {
			var keys = Object.keys(freeVars);
			var values = [];
			var removeKeys = [];
			keys.forEach(function(key, idx) {
				if(freeVars[key].id === module.id) {
					removeKeys.push(idx);
				} else {
					values.push(freeVars[key]);
				}
			});
			removeKeys.reverse().forEach(function(idx) {
				keys.splice(idx, 1);
			});
			if(keys.length === 0) return;
			values.forEach(function(requireItem, idx) {
				if(requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
					var prefix = "";
					if(requireItem.name)
						prefix += "/* " + requireItem.name + " */";
					values[idx] = "require(" + prefix + toRealId(requireItem.id) + ")" + (requireItem.append || "");
				}
			});
			var start = "/* WEBPACK FREE VAR INJECTION */ (function(" + keys.join(",") + ") {";
			var end = "/* WEBPACK FREE VAR INJECTION */ }(" + values.join(",") + "))"
			if(blockRange) {
				replaces.push({
					from: blockRange[0],
					to: blockRange[0]-1,
					value: start
				});
				replaces.push({
					from: blockRange[1],
					to: blockRange[1]-1,
					value: end
				});
			} else {
				modulePrepends.unshift("/******/ " + start + "\n");
				moduleAppends.push("\n/******/ " + end);
			}
		}
		genReplacesFreeVars(null, freeVars);
		replaces.sort(function(a, b) {
			return b.from - a.from;
		});
		var source = module.source;
		result = [source];
		replaces.forEach(function(repl) {
			var remSource = result.pop();
			result.push(
				remSource.substr(repl.to+1),
				repl.value,
				remSource.substr(0, repl.from)
			);
		});
		result = result.reverse().join("");
	}
	// minimize if in debug mode
	// else calculate the minimized size for stats
	if(options.minimize) {
		var minimized = uglify(result, module.filename);
		module.size = minimized.length;
		if(options.debug) {
			result = minimized;
		}
	} else {
		module.size = result.length;
	}
	if(options.debug) {
		// create a cool eval for debug mode
		var shortenFilename = require("./createFilenameShortener")(options.context);
		result = [
			"eval(",
			JSON.stringify([
				result,
				"\n\n// WEBPACK FOOTER //\n",
				"// module.id = ", module.id, "\n",
				"// module.realId = ", module.realId, "\n",
				"// module.chunks = ", module.chunks.join(", "), "\n",
				"//@ sourceURL=webpack-module:///", encodeURI(shortenFilename(module.filename || module.dirname)).replace(/%5C|%2F/g, "/").replace(/^\//, "")
			].join("")),
			");"].join("");
	}
	var finalResult = [];
	finalResult.push.apply(finalResult, modulePrepends);
	finalResult.push(result);
	finalResult.push.apply(finalResult, moduleAppends);
	return finalResult.join("");
}

function uglify(input, filename) {
	var uglify = require("uglify-js");
	try {
		source = uglify.parser.parse(input);
		source = uglify.uglify.ast_mangle(source);
		source = uglify.uglify.ast_squeeze(source);
		source = uglify.uglify.gen_code(source);
	} catch(e) {
		throw new Error(filename + " @ Line " + e.line + ", Col " + e.col + ", " + e.message);
		return input;
	}
	return source;
}