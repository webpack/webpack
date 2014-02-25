/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function OccurrenceOrderPlugin(preferEntry) {
	this.preferEntry = preferEntry;
}
module.exports = OccurrenceOrderPlugin;
OccurrenceOrderPlugin.prototype.apply = function(compiler) {
	var preferEntry = this.preferEntry;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-module-order", function(modules) {
			function entryChunks(m) {
				return m.chunks.filter(function(c) {
					return c.initial;
				}).length;
			}
			function occursInEntry(m) {
				return m.reasons.map(function(r) {
					if(!r.module) return 0;
					return entryChunks(r.module);
				}).reduce(function(a, b) { return a+b; }, 0) + entryChunks(m);
			}
			function occurs(m) {
				return m.reasons.map(function(r) {
					if(!r.module) return 0;
					return r.module.chunks.length;
				}).reduce(function(a, b) { return a+b; }, 0) + m.chunks.length;
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
		});
		compilation.plugin("optimize-chunk-order", function(chunks) {
			function occursInEntry(c) {
				return c.parents.filter(function(p) {
					return p.initial;
				}).length + (c.entry ? 1 : 0);
			}
			function occurs(c) {
				return c.blocks.length + (c.entry ? 1 : 0);
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
		});
	});
};