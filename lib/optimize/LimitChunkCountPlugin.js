/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function LimitChunkCountPlugin(options) {
	if(options !== undefined && typeof options !== "object" || Array.isArray(options)) {
		throw new Error("Argument should be an options object.\nFor more info on options, see http://webpack.github.io/docs/list-of-plugins.html");
	}
	this.options = options || {};
}
module.exports = LimitChunkCountPlugin;

LimitChunkCountPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {
			var maxChunks = options.maxChunks;
			if(!maxChunks) return;
			if(maxChunks < 1) return;
			if(chunks.length <= maxChunks) return;

			if(chunks.length > maxChunks) {
				var combinations = [];
				chunks.forEach(function(a, idx) {
					for(var i = 0; i < idx; i++) {
						var b = chunks[i];
						combinations.push([b, a]);
					}
				});

				combinations.forEach(function(pair) {
					var a = pair[0].size(options);
					var b = pair[1].size(options);
					var ab = pair[0].integratedSize(pair[1], options);
					pair.unshift(a + b - ab, ab);
				});
				combinations = combinations.filter(function(pair) {
					return pair[1] !== false;
				});
				combinations.sort(function(a, b) {
					var diff = b[0] - a[0];
					if(diff !== 0) return diff;
					return a[1] - b[1];
				});

				var pair = combinations[0];

				if(pair && pair[2].integrate(pair[3], "limit")) {
					chunks.splice(chunks.indexOf(pair[3]), 1);
					this.restartApplyPlugins();
				}
			}
		});
	});
};
