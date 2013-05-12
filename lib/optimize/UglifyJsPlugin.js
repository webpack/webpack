/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SourceMapSource = require("webpack-core/lib/SourceMapSource");
var uglify = require("uglify-js");

function UglifyJsPlugin(options) {
	if(typeof options != "object") options = {};
	if(typeof options.compressor == "undefined") {
		options.compressor = {
			warnings: false
		}
	}
	this.options = options;
}
module.exports = UglifyJsPlugin;
UglifyJsPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunk-assets", function(chunks, callback) {
			var files = [];
			chunks.forEach(function(chunk) {
				chunk.files.forEach(function(file) {
					files.push(file);
				});
			});
			files.forEach(function(file) {
				try {
					var input = compilation.assets[file].source();
					var inputSourceMap = compilation.assets[file].map();
					var ast = uglify.parse(input, {
						filename: file
					});
					ast.figure_out_scope()
					if(options.compressor !== false) {
						var compressor = uglify.Compressor(options.compressor);
						ast = ast.transform(compressor);
						ast.figure_out_scope();
						ast.compute_char_frequency(options.mangle || {});
						ast.mangle_names(options.mangle || {});
					}
					var map = null;
					map = uglify.SourceMap({
						file: file,
						root: ""
					});
					var stream = uglify.OutputStream({
						comments: options.comments || /^\**!|@preserve|@license/,
						beautify: options.beautify,
						source_map: map
					});
					ast.print(stream);
					map = map + "";
					stream = stream + "";
					compilation.assets[file] = new SourceMapSource(stream, file, map, input, inputSourceMap);
				} catch(err) {
					err.file = file;
					compilation.warnings.push(err);
				}
			});
			callback();
		});
		compilation.plugin("normal-module-loader", function(context) {
			context.minimize = true;
		});
	});
};