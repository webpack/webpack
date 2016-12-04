/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function OccurrenceOrderPlugin(preferEntry) {
	if(preferEntry !== undefined && typeof preferEntry !== "boolean") {
		throw new Error("Argument should be a boolean.\nFor more info on this plugin, see https://webpack.github.io/docs/list-of-plugins.html");
	}
	this.preferEntry = preferEntry;
}
module.exports = OccurrenceOrderPlugin;
OccurrenceOrderPlugin.prototype.apply = function(compiler) {
	var preferEntry = this.preferEntry;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-module-order", function(modules) {
			function entryChunks(m) {
				return m.chunks.map(function(c) {
					var sum = (c.isInitial() ? 1 : 0) + (c.entryModule === m ? 1 : 0);
					return sum;
				}).reduce(function(a, b) {
					return a + b;
				}, 0);
			}

			function occursInEntry(m) {
				if(typeof m.__OccurenceOrderPlugin_occursInEntry === "number") return m.__OccurenceOrderPlugin_occursInEntry;
				var result = m.reasons.map(function(r) {
					if(!r.module) return 0;
					return entryChunks(r.module);
				}).reduce(function(a, b) {
					return a + b;
				}, 0) + entryChunks(m);
				return m.__OccurenceOrderPlugin_occursInEntry = result;
			}

			function occurs(m) {
				if(typeof m.__OccurenceOrderPlugin_occurs === "number") return m.__OccurenceOrderPlugin_occurs;
				var result = m.reasons.map(function(r) {
					if(!r.module) return 0;
					return r.module.chunks.length;
				}).reduce(function(a, b) {
					return a + b;
				}, 0) + m.chunks.length + m.chunks.filter(function(c) {
					c.entryModule === m;
				}).length;
				return m.__OccurenceOrderPlugin_occurs = result;
			}
			modules.sort(function(a, b) {
				if(preferEntry) {
					var aEntryOccurs = occursInEntry(a);
					var bEntryOccurs = occursInEntry(b);
					if(aEntryOccurs > bEntryOccurs) return -1;
					if(aEntryOccurs < bEntryOccurs) return 1;
				}
				var aOccurs = occurs(a);
				var bOccurs = occurs(b);
				if(aOccurs > bOccurs) return -1;
				if(aOccurs < bOccurs) return 1;
				if(a.identifier() > b.identifier()) return 1;
				if(a.identifier() < b.identifier()) return -1;
				return 0;
			});
			// TODO refactor to Map
			modules.forEach(function(m) {
				m.__OccurenceOrderPlugin_occursInEntry = undefined;
				m.__OccurenceOrderPlugin_occurs = undefined;
			});
		});
		compilation.plugin("optimize-chunk-order", function(chunks) {
			function occursInEntry(c) {
				if(typeof c.__OccurenceOrderPlugin_occursInEntry === "number") return c.__OccurenceOrderPlugin_occursInEntry;
				var result = c.parents.filter(function(p) {
					return p.isInitial();
				}).length;
				return c.__OccurenceOrderPlugin_occursInEntry = result;
			}

			function occurs(c) {
				return c.blocks.length;
			}
			chunks.forEach(function(c) {
				c.modules.sort(function(a, b) {
					if(a.identifier() > b.identifier()) return 1;
					if(a.identifier() < b.identifier()) return -1;
					return 0;
				});
			});
			chunks.sort(function(a, b) {
				var aEntryOccurs = occursInEntry(a);
				var bEntryOccurs = occursInEntry(b);
				if(aEntryOccurs > bEntryOccurs) return -1;
				if(aEntryOccurs < bEntryOccurs) return 1;
				var aOccurs = occurs(a);
				var bOccurs = occurs(b);
				if(aOccurs > bOccurs) return -1;
				if(aOccurs < bOccurs) return 1;
				if(a.modules.length > b.modules.length) return -1;
				if(a.modules.length < b.modules.length) return 1;
				for(var i = 0; i < a.modules.length; i++) {
					if(a.modules[i].identifier() > b.modules[i].identifier()) return -1;
					if(a.modules[i].identifier() < b.modules[i].identifier()) return 1;
				}
				return 0;
			});
			// TODO refactor to Map
			chunks.forEach(function(c) {
				c.__OccurenceOrderPlugin_occursInEntry = undefined;
			});
		});
	});
};
