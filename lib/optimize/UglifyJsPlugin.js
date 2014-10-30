/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SourceMapConsumer = require("webpack-core/lib/source-map").SourceMapConsumer;
var SourceMapSource = require("webpack-core/lib/SourceMapSource");
var RequestShortener = require("../RequestShortener");
var uglify = require("uglify-js");

function UglifyJsPlugin(options) {
	if(typeof options !== "object") options = {};
	if(typeof options.compressor !== "undefined") {
		options.compress = options.compressor;
	}
	this.options = options;
}
module.exports = UglifyJsPlugin;

UglifyJsPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	var that = this;
	options.test = options.test || /\.js($|\?)/i;

	var requestShortener = new RequestShortener(compiler.context);
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("build-module", function(module) {
			// to get detailed location info about errors
			module.useSourceMap = true;
		});
		compilation.plugin("optimize-chunk-assets", function(chunks, callback) {
			var files = [];
			chunks.forEach(function(chunk) {
				chunk.files.forEach(function(file) {
					files.push(file);
				});
			});
			compilation.additionalChunkAssets.forEach(function(file) {
				files.push(file);
			});
			files = files.filter(that.matchObject.bind(that, options));
			files.forEach(function(file) {
				var oldWarnFunction = uglify.AST_Node.warn_function;
				var warnings = [];
				try {
					var asset = compilation.assets[file];
					var input = asset.source();
					if(asset.__UglifyJsPlugin) {
						compilation.assets[file] = asset.__UglifyJsPlugin;
						return;
					}
					var inputSourceMap = asset.map();
					var sourceMap = new SourceMapConsumer(inputSourceMap);
					uglify.AST_Node.warn_function = function(warning) {
						var match = /\[.+:([0-9]+),([0-9]+)\]/.exec(warning);
						var line = +match[1];
						var column = +match[2];
						var original = sourceMap.originalPositionFor({
							line: line,
							column: column
						});
						if(!original || !original.source || original.source === file) return;
						warnings.push(warning.replace(/\[.+:([0-9]+),([0-9]+)\]/, "") + 
							"[" + requestShortener.shorten(original.source) + ":" + original.line + "," + original.column + "]");
					};
					var ast = uglify.parse(input, {
						filename: file
					});
					ast.figure_out_scope()
					if(options.compress !== false) {
						var compress = uglify.Compressor(options.compress);
						ast = ast.transform(compress);
						ast.figure_out_scope();
						if(options.mangle !== false) {
							ast.compute_char_frequency(options.mangle || {});
							ast.mangle_names(options.mangle || {});
						}
					}
					var map = null;
					map = uglify.SourceMap({
						file: file,
						root: ""
					});
					var output = {};
					output.comments = options.comments || /^\**!|@preserve|@license/;
					output.beautify = options.beautify;
					for(var k in options.output) {
						output[k] = options.output[k];
					}
					output.source_map = map;
					var stream = uglify.OutputStream(output);
					ast.print(stream);
					map = map + "";
					stream = stream + "";
					asset.__UglifyJsPlugin = compilation.assets[file] = new SourceMapSource(stream, file, map, input, inputSourceMap);
					if(warnings.length > 0) {
						compilation.warnings.push(new Error(file + " from UglifyJs\n" + warnings.join("\n")));
					}
				} catch(err) {
					if(err.line) {
						var original = sourceMap.originalPositionFor({
							line: err.line,
							column: err.col
						});
						if(original && original.source) {
							compilation.errors.push(new Error(file + " from UglifyJs\n" + err.message + " [" + requestShortener.shorten(original.source) + ":" + original.line + "," + original.column + "]"));
						} else {
							compilation.errors.push(new Error(file + " from UglifyJs\n" + err.message + " [" + file + ":" + err.line + "," + err.col + "]"));
						}
					} else
						compilation.errors.push(new Error(file + " from UglifyJs\n" + err.stack));
				} finally {
					uglify.AST_Node.warn_function = oldWarnFunction;
				}
			});
			callback();
		});
		compilation.plugin("normal-module-loader", function(context) {
			context.minimize = true;
		});
	});
};

function asRegExp(test) {
	if(typeof test == "string") test = new RegExp("^"+test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	return test;
}

UglifyJsPlugin.prototype.matchPart = function matchPart(str, test) {
	if(!test) return true;
	test = asRegExp(test);
	if(Array.isArray(test)) {
		return test.map(asRegExp).filter(function(regExp) {
			return regExp.test(str);
		}).length > 0;
	} else {
		return test.test(str);
	}
};

UglifyJsPlugin.prototype.matchObject = function matchObject(obj, str) {
	if(obj.test)
		if(!this.matchPart(str, obj.test)) return false;
	if(obj.include)
		if(!this.matchPart(str, obj.include)) return false;
	if(obj.exclude)
		if(this.matchPart(str, obj.exclude)) return false;
	return true;
};
