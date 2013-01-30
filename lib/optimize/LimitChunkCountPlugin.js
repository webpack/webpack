/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function chunkSizeWithModules(modules) {
	return modules.map(function(m) {
		return m.size();
	}).reduce(function(a, b) {
		return a + b;
	});
}

function LimitChunkCountPlugin(options) {
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

			var CHUNK_OVERHEAD = options.chunkOverhead || 10000;
			var ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

			while(chunks.length > maxChunks) {
				var combinations = [];
				chunks.forEach(function(a, idx) {
					for(var i = 0; i < idx; i++) {
						var b = chunks[i];
						combinations.push([b, a]);
					}
				});

				combinations.forEach(function(pair) {
					var modulesA = pair[0].modules;
					var modulesB = pair[1].modules;
					var mergedModules = modulesA.slice();
					modulesB.forEach(function(m) {
						if(modulesA.indexOf(m) < 0)
							mergedModules.push(m);
					});
					var a = chunkSizeWithModules(modulesA) * (pair[0].entry ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
					var b = chunkSizeWithModules(modulesB) * (pair[1].entry ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
					var ab = chunkSizeWithModules(mergedModules) * (pair[0].entry || pair[1].entry ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
					pair.unshift(a + b - ab, ab);
				});
				combinations.sort(function(a,b) {
					var diff = b[0] - a[0];
					if(diff != 0) return diff;
					return a[1] - b[1];
				});

				var pair = combinations[0];

				pair[2].integrate(pair[3], "limit");
				chunks.splice(chunks.indexOf(pair[3]), 1);
			}
			this.restartApplyPlugins();
		});
	});
};

