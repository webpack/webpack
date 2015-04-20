/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function MinChunkSizePlugin(options) {
	this.options = options;
}
module.exports = MinChunkSizePlugin;

MinChunkSizePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	var minChunkSize = options.minChunkSize;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {

			var combinations = [];
			chunks.forEach(function(a, idx) {
				for(var i = 0; i < idx; i++) {
					var b = chunks[i];
					combinations.push([b, a]);
				}
			});

			var equalOptions = {
				chunkOverhead: 1,
				entryChunkMultiplicator: 1
			};
			combinations = combinations.filter(function(pair) {
				return pair[0].size(equalOptions) < minChunkSize || pair[1].size(equalOptions) < minChunkSize;
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
			
			if(combinations.length === 0) return;

			combinations.sort(function(a,b) {
				var diff = b[0] - a[0];
				if(diff !== 0) return diff;
				return a[1] - b[1];
			});

			var pair = combinations[0];

			pair[2].integrate(pair[3], "min-size");
			chunks.splice(chunks.indexOf(pair[3]), 1);
			this.restartApplyPlugins();
		});
	});
};

