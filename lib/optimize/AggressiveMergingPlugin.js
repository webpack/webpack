/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function AggressiveMergingPlugin(options) {
	if(options !== undefined && typeof options !== "object" || Array.isArray(options)) {
		throw new Error("Argument should be an options object. To use defaults, pass in nothing.\nFor more info on options, see https://webpack.github.io/docs/list-of-plugins.html");
	}
	this.options = options || {};
}
module.exports = AggressiveMergingPlugin;

AggressiveMergingPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	var minSizeReduce = options.minSizeReduce || 1.5;

	function getParentsWeight(chunk) {
		return chunk.parents.map(function(p) {
			return p.initial ? options.entryChunkMultiplicator || 10 : 1;
		}).reduce(function(a, b) {
			return a + b;
		}, 0);
	}
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {
			var combinations = [];
			chunks.forEach(function(a, idx) {
				if(a.initial) return;
				for(var i = 0; i < idx; i++) {
					var b = chunks[i];
					if(b.initial) continue;
					combinations.push([b, a]);
				}
			});

			combinations.forEach(function(pair) {
				var a = pair[0].size({
					chunkOverhead: 0
				});
				var b = pair[1].size({
					chunkOverhead: 0
				});
				var ab = pair[0].integratedSize(pair[1], {
					chunkOverhead: 0
				});
				pair.push({
					a: a,
					b: b,
					ab: ab
				});
				if(ab === false) {
					pair.unshift(false);
				} else if(options.moveToParents) {
					var aOnly = ab - b;
					var bOnly = ab - a;
					var common = a + b - ab;
					var newSize = common + getParentsWeight(pair[0]) * aOnly + getParentsWeight(pair[1]) * bOnly;
					pair.push({
						aOnly: aOnly,
						bOnly: bOnly,
						common: common,
						newSize: newSize
					});
				} else {
					var newSize = ab;
				}

				pair.unshift((a + b) / newSize);
			});
			combinations = combinations.filter(function(pair) {
				return pair[0] !== false;
			});
			combinations.sort(function(a, b) {
				return b[0] - a[0];
			});

			var pair = combinations[0];

			if(!pair) return;
			if(pair[0] < minSizeReduce) return;

			if(options.moveToParents) {
				var commonModules = pair[1].modules.filter(function(m) {
					return pair[2].modules.indexOf(m) >= 0;
				});
				var aOnlyModules = pair[1].modules.filter(function(m) {
					return commonModules.indexOf(m) < 0;
				});
				var bOnlyModules = pair[2].modules.filter(function(m) {
					return commonModules.indexOf(m) < 0;
				});
				aOnlyModules.forEach(function(m) {
					pair[1].removeModule(m);
					m.removeChunk(pair[1]);
					pair[1].parents.forEach(function(c) {
						c.addModule(m);
						m.addChunk(c);
					});
				});
				bOnlyModules.forEach(function(m) {
					pair[2].removeModule(m);
					m.removeChunk(pair[2]);
					pair[2].parents.forEach(function(c) {
						c.addModule(m);
						m.addChunk(c);
					});
				});
			}
			if(pair[1].integrate(pair[2], "aggressive-merge")) {
				chunks.splice(chunks.indexOf(pair[2]), 1);
				this.restartApplyPlugins();
			}
		});
	});
};
