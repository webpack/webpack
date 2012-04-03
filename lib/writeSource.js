/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(module, options) {
	if(!module.source) {
		if(module.requireMap) {
			var extensions = (options.resolve && options.resolve.extensions) || [".web.js", ".js"];
			var extensionsAccess = [];
			extensions.forEach(function(ext) {
				extensionsAccess.push("||map[name+\"");
				extensionsAccess.push(ext.replace(/\\/g, "\\\\").replace(/"/g, "\\\""));
				extensionsAccess.push("\"]");
			});

			return "/***/module.exports = function(name) {\n" +
				"/***/\tvar map = " + JSON.stringify(module.requireMap) + ";\n" +
				"/***/\treturn require(map[name]" + extensionsAccess.join("") + "||name);\n" +
				"/***/};";
		}
		return;
	}
	var replaces = []; // { from: 123, to: 125, value: "4" }
	function genReplaceRequire(requireItem) {
		if(requireItem.id !== undefined) {
			var prefix = "";
			if(requireItem.name)
				prefix += "/* " + requireItem.name + " */";
			if(requireItem.expressionRange) {
				replaces.push({
					from: requireItem.expressionRange[0],
					to: requireItem.expressionRange[1],
					value: "require(" + prefix + requireItem.id + ")"
				});
			} else if(requireItem.valueRange) {
				replaces.push({
					from: requireItem.valueRange[0],
					to: requireItem.valueRange[1],
					value: prefix + requireItem.id
				});
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
				value: "require(" + prefix + ((contextItem.id || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")"
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
				value: "require(" + prefix + ((contextItem.id || JSON.stringify("context: " + contextItem.name || "context failed")) + "") + ")" + postfix
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
					value: ((asyncItem.chunkId || "0") + "")
				});
			}
		});
	}
	replaces.sort(function(a, b) {
		return b.from - a.from;
	});
	var source = module.source;
	var result = [source];
	replaces.forEach(function(repl) {
		var remSource = result.shift();
		result.unshift(
			remSource.substr(0, repl.from),
			repl.value,
			remSource.substr(repl.to+1)
		);
	});
	if(options.debug) {
		if(options.minimize) {
			result = [uglify(result.join(""), module.filename)];
		}
		result.push("\n\n// WEBPACK FOOTER //\n"+
			"// module.id = " + module.id + "\n" +
			"//@ sourceURL=webpack-module://" + encodeURI(module.filename).replace(/%5C|%2F/g, "/"));
		return "eval(" + JSON.stringify(result.join("")) + ")";
	}
	return result.join("");
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