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

class UglifyJsPlugin {
	constructor(options) {
		if(typeof options !== "object" || Array.isArray(options)) options = {};
		if(typeof options.compressor !== "undefined") options.compress = options.compressor;
		this.options = options;
	}

	apply(compiler) {
		let options = this.options;
		options.test = options.test || /\.js($|\?)/i;

		let requestShortener = new RequestShortener(compiler.context);
		compiler.plugin("compilation", (compilation) => {
			if(options.sourceMap) {
				compilation.plugin("build-module", (module) => {
					// to get detailed location info about errors
					module.useSourceMap = true;
				});
			}
			compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
				let files = [];
				chunks.forEach((chunk) => files.push.apply(files, chunk.files));
				files.push.apply(files, compilation.additionalChunkAssets);
				files = files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options));
				files.forEach((file) => {
					let oldWarnFunction = uglify.AST_Node.warn_function;
					let warnings = [];
					let sourceMap;
					try {
						let asset = compilation.assets[file];
						if(asset.__UglifyJsPlugin) {
							compilation.assets[file] = asset.__UglifyJsPlugin;
							return;
						}
						let input;
						let inputSourceMap;
						if(options.sourceMap) {
							if(asset.sourceAndMap) {
								let sourceAndMap = asset.sourceAndMap();
								inputSourceMap = sourceAndMap.map;
								input = sourceAndMap.source;
							} else {
								inputSourceMap = asset.map();
								input = asset.source();
							}
							sourceMap = new SourceMapConsumer(inputSourceMap);
							uglify.AST_Node.warn_function = (warning) => { // eslint-disable-line camelcase
								let match = /\[.+:([0-9]+),([0-9]+)\]/.exec(warning);
								let line = +match[1];
								let column = +match[2];
								let original = sourceMap.originalPositionFor({
									line: line,
									column: column
								});
								if(!original || !original.source || original.source === file) return;
								warnings.push(warning.replace(/\[.+:([0-9]+),([0-9]+)\]/, "") +
									"[" + requestShortener.shorten(original.source) + ":" + original.line + "," + original.column + "]");
							};
						} else {
							input = asset.source();
							uglify.AST_Node.warn_function = (warning) => { // eslint-disable-line camelcase
								warnings.push(warning);
							};
						}
						uglify.base54.reset();
						let ast = uglify.parse(input, {
							filename: file
						});
						if(options.compress !== false) {
							ast.figure_out_scope();
							let compress = uglify.Compressor(options.compress || {
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
						let output = {};
						output.comments = Object.prototype.hasOwnProperty.call(options, "comments") ? options.comments : /^\**!|@preserve|@license/;
						output.beautify = options.beautify;
						for(let k in options.output) {
							output[k] = options.output[k];
						}
						let map;
						if(options.sourceMap) {
							map = uglify.SourceMap({ // eslint-disable-line new-cap
								file: file,
								root: ""
							});
							output.source_map = map; // eslint-disable-line camelcase
						}
						let stream = uglify.OutputStream(output); // eslint-disable-line new-cap
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
							let original = sourceMap && sourceMap.originalPositionFor({
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
				});
				callback();
			});
		});
	}
}

module.exports = UglifyJsPlugin;
