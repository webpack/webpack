/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SourceMapConsumer = require("source-map").SourceMapConsumer;
const SourceMapSource = require("webpack-sources").SourceMapSource;
const RawSource = require("webpack-sources").RawSource;
const RequestShortener = require("../RequestShortener");
const ModuleFilenameHelpers = require("../ModuleFilenameHelpers");
const uglify = require("uglify-js");

const regexp = {
	testJs: /\.js($|\?)/i,
	matchWarn: /\[.+:([0-9]+),([0-9]+)\]/,
	comments: /^\**!|@preserve|@license/
};

function warnFunction(warnings) {
	return function(warning) {
		warnings.push(warning);
	};
}

function warnFunctionSourceMap(sourceMap, file, warnings, requestShortener) {
	return function(warning) {
		var match = regexp.matchWarn.exec(warning);
		var line = +match[1];
		var column = +match[2];
		var original = sourceMap.originalPositionFor({
			line: line,
			column: column
		});
		if(!original || !original.source || original.source === file) return;
		warnings.push(warning.replace(regexp.matchWarn, "") +
			"[" + requestShortener.shorten(original.source) + ":" + original.line + "," + original.column + "]");
	};
}

class UglifyJsPlugin {
	constructor(options) {
		if(typeof options !== "object" || Array.isArray(options)) options = {};
		if(typeof options.compressor !== "undefined") options.compress = options.compressor;
		this.options = options;
	}

	apply(compiler) {
		let options = this.options;
		options.test = options.test || regexp.testJs;

		let requestShortener = new RequestShortener(compiler.context);
		compiler.plugin("compilation", (compilation) => {
			if(options.sourceMap) {
				compilation.plugin("build-module", (module) => {
					// to get detailed location info about errors
					module.useSourceMap = true;
				});
			}
			compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
				var files = [];
				for(var indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
					files.push.apply(files, chunks[indexChunk].files);
				}
				files.push.apply(files, compilation.additionalChunkAssets);
				for(var indexFile = 0; indexFile < files.length; indexFile++) {
					var file = files[indexFile];

					if(!ModuleFilenameHelpers.matchObject(options, file)) {
						continue;
					}

					var oldWarnFunction = uglify.AST_Node.warn_function;
					var warnings = [];
					var sourceMap;
					try {
						var asset = compilation.assets[file];
						if(asset.__UglifyJsPlugin) {
							compilation.assets[file] = asset.__UglifyJsPlugin;
							return;
						}
						var input;
						var inputSourceMap;
						if(options.sourceMap) {
							if(asset.sourceAndMap) {
								var sourceAndMap = asset.sourceAndMap();
								inputSourceMap = sourceAndMap.map;
								input = sourceAndMap.source;
							} else {
								inputSourceMap = asset.map();
								input = asset.source();
							}
							sourceMap = new SourceMapConsumer(inputSourceMap);
							uglify.AST_Node.warn_function = warnFunctionSourceMap(sourceMap, file, warnings, requestShortener);
						} else {
							input = asset.source();
							uglify.AST_Node.warn_function = warnFunction(warnings);
						}
						uglify.base54.reset();
						var ast = uglify.parse(input, {
							filename: file
						});
						if(options.compress !== false) {
							ast.figure_out_scope();
							var compress = uglify.Compressor(options.compress || {
								warnings: false
							}); // eslint-disable-line new-cap
							ast = ast.transform(compress);
						}
						if(options.mangle !== false) {
							ast.figure_out_scope(options.mangle || {});
							ast.compute_char_frequency(options.mangle || {});
							ast.mangle_names(options.mangle || {});
							if(options.mangle && options.mangle.props) {
								uglify.mangle_properties(ast, options.mangle.props);
							}
						}
						var output = {};
						output.comments = Object.prototype.hasOwnProperty.call(options, "comments") ? options.comments : regexp.comments;
						output.beautify = options.beautify;
						for(var k in options.output) {
							output[k] = options.output[k];
						}
						var map;
						if(options.sourceMap) {
							map = uglify.SourceMap({ // eslint-disable-line new-cap
								file: file,
								root: ""
							});
							output.source_map = map; // eslint-disable-line camelcase
						}
						var stream = uglify.OutputStream(output); // eslint-disable-line new-cap
						ast.print(stream);
						if(map) map = map + "";
						stream = stream + "";
						asset.__UglifyJsPlugin = compilation.assets[file] = (map ?
							new SourceMapSource(stream, file, JSON.parse(map), input, inputSourceMap) :
							new RawSource(stream));
						if(warnings.length > 0) {
							compilation.warnings.push(new Error(file + " from UglifyJs\n" + warnings.join("\n")));
						}
					} catch(err) {
						if(err.line) {
							var original = sourceMap && sourceMap.originalPositionFor({
								line: err.line,
								column: err.col
							});
							if(original && original.source) {
								compilation.errors.push(new Error(file + " from UglifyJs\n" + err.message + " [" + requestShortener.shorten(original.source) + ":" + original.line + "," + original.column + "][" + file + ":" + err.line + "," + err.col + "]"));
							} else {
								compilation.errors.push(new Error(file + " from UglifyJs\n" + err.message + " [" + file + ":" + err.line + "," + err.col + "]"));
							}
						} else if(err.msg) {
							compilation.errors.push(new Error(file + " from UglifyJs\n" + err.msg));
						} else
							compilation.errors.push(new Error(file + " from UglifyJs\n" + err.stack));
					} finally {
						uglify.AST_Node.warn_function = oldWarnFunction; // eslint-disable-line camelcase
					}
				}
				callback();
			});
		});
	}
}

module.exports = UglifyJsPlugin;
