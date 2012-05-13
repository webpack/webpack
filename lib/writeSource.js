/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(module, options, toRealId, toRealChuckId) {
	var result;
	if(typeof module.source !== "string") {
		// if no source is avalible, try to generate it
		if(module.requireMap) { // with a require map
			var extensions = (options.resolve && options.resolve.extensions) || [".web.js", ".js"];
			var extensionsAccess = [];
			extensions.forEach(function(ext) {
				extensionsAccess.push("map[name+\"" +
						ext.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") +
						"\"]");
			});
			var realRequireMap = {};
			Object.keys(module.requireMap).sort().forEach(function(file) {
				realRequireMap[file] = toRealId(module.requireMap[file]);
			});

			result = "/***/\tvar map = " + JSON.stringify(realRequireMap) + ",\n" +
				"/***/requireInContext = module.exports = function(name) {\n" +
				"/***/\treturn require(" + extensionsAccess.join("||") + "||name);\n" +
				"/***/};" +
				"/***/requireInContext.keys = function() { return Object.keys(map) }";
		} else
			return;
	} else {
		// take the original source and replace the names with ids
		// and inject free variables
		var freeVars = {};
		var replaces = []; // { from: 123, to: 125, value: "4" }
		var modulePrepends = [];
		var moduleAppends = [];
		function genReplaceRequire(requireItem) {
			if(requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
				var prefix = "";
				if(requireItem.name)
					prefix += "/* " + requireItem.name + " */";
				if(requireItem.expressionRange) {
					replaces.push({
						from: requireItem.expressionRange[0],
						to: requireItem.expressionRange[1],
						value: "require(" + prefix + toRealId(requireItem.id) + ")" + (requireItem.append || "")
					});
				} else if(requireItem.valueRange) {
					replaces.push({
						from: requireItem.valueRange[0],
						to: requireItem.valueRange[1],
						value: prefix + toRealId(requireItem.id)
					});
				} else if(requireItem.variable) {
					if(!freeVars[requireItem.variable]) {
						freeVars[requireItem.variable] = requireItem;
					}
				}
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
				if(contextItem.replace)
					replaces.push({
						from: contextItem.replace[0][0],
						to: contextItem.replace[0][1],
						value: JSON.stringify(contextItem.replace[1])
					});
			} else {
				replaces.push({
					from: contextItem.expressionRange[0],
					to: contextItem.expressionRange[1],
					value: "require(" + prefix + (((contextItem.id && toRealId(contextItem.id)) || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")" + postfix
				});
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
				if(asyncItem.namesRange) {
					replaces.push({
						from: asyncItem.namesRange[0],
						to: asyncItem.namesRange[1],
						value: ((asyncItem.chunkId && toRealChuckId(asyncItem.chunkId) || "0") + "")
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
			var remSource = result.shift();
			result.unshift(
				remSource.substr(0, repl.from),
				repl.value,
				remSource.substr(repl.to+1)
			);
		});
		result = result.join("");
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
		result = [
			"eval(",
			JSON.stringify([
				result,
				"\n\n// WEBPACK FOOTER //\n",
				"// module.id = ", module.id, "\n",
				"// module.realId = ", module.realId, "\n",
				"// module.chunks = ", module.chunks.join(", "), "\n",
				"//@ sourceURL=webpack-module://", encodeURI(module.filename || module.dirname).replace(/%5C|%2F/g, "/")
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