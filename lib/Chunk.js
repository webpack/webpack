/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Chunk(name, module, loc) {
	this.id = null;
	this.ids = null;
	this.name = name;
	this.modules = [];
	this.chunks = [];
	this.parents = [];
	this.blocks = [];
	this.origins = [];
	this.files = [];
	this.rendered = false;
	this.entry = false;
	this.initial = false;
	if(module) {
		this.origins.push({
			module: module,
			loc: loc,
			name: name
		});
	}
}
module.exports = Chunk;

Chunk.prototype.addModule = function(module) {
	if(this.modules.indexOf(module) >= 0) {
		return false;
	}
	this.modules.push(module);
	return true;
};

Chunk.prototype._removeAndDo = require("./removeAndDo");

Chunk.prototype.removeModule = function(module) {
	this._removeAndDo("modules", module, "removeChunk");
};

Chunk.prototype.removeChunk = function(chunk) {
	this._removeAndDo("chunks", chunk, "removeParent");
};

Chunk.prototype.removeParent = function(chunk) {
	this._removeAndDo("parents", chunk, "removeChunk");
};

function createAdder(collection) {
	return function(chunk) {
		if(chunk === this) {
			return false;
		}
		if(this[collection].indexOf(chunk) >= 0) {
			return false;
		}
		this[collection].push(chunk);
		return true;
	};
}

Chunk.prototype.addChunk = createAdder("chunks");

Chunk.prototype.addParent = createAdder("parents");

Chunk.prototype.addBlock = function(block) {
	if(this.blocks.indexOf(block) >= 0) {
		return false;
	}
	this.blocks.push(block);
	return true;
};

Chunk.prototype.addOrigin = function(module, loc) {
	this.origins.push({module: module, loc: loc, name: this.name});
};

Chunk.prototype.remove = function(reason) {
	this.modules.slice().forEach(function(m) {
		m.removeChunk(this);
	}, this);
	this.parents.forEach(function(c) {
		var idx = c.chunks.indexOf(this);
		if(idx >= 0) {
			c.chunks.splice(idx, 1);
		}
		this.chunks.forEach(function(cc) {
			cc.addParent(c);
		});
	}, this);
	this.chunks.forEach(function(c) {
		var idx = c.parents.indexOf(this);
		if(idx >= 0) {
			c.parents.splice(idx, 1);
		}
		this.parents.forEach(function(cc) {
			cc.addChunk(c);
		});
	}, this);
	this.blocks.forEach(function(b) {
		var idx = b.chunks.indexOf(this);
		if(idx >= 0) {
			b.chunks.splice(idx, 1);
			if(b.chunks.length === 0) {
				b.chunks = null;
				b.chunkReason = reason;
			}
		}
	}, this);
};

Chunk.prototype.integrate = function(other, reason) {
	if(!this.canBeIntegrated(other)) {
		return false;
	}

	var otherModules = other.modules.slice();
	otherModules.forEach(function(m) {
		m.removeChunk(other);
		m.addChunk(this);
		this.addModule(m);
		m.rewriteChunkInReasons(other, [this]);
	}, this);
	other.modules.length = 0;
	function moveChunks(chunks, kind, onChunk) {
		chunks.forEach(function(c) {
			var idx = c[kind].indexOf(other);
			if(idx >= 0) {
				c[kind].splice(idx, 1);
			}
			onChunk(c);
		});
	}
	moveChunks(other.parents, "chunks", function(c) {
		if(c !== this && this.addParent(c)) {
			c.addChunk(this);
		}
	}.bind(this));
	other.parents.length = 0;
	moveChunks(other.chunks, "parents", function(c) {
		if(c !== this && this.addChunk(c)) {
			c.addParent(this);
		}
	}.bind(this));
	other.chunks.length = 0;
	other.blocks.forEach(function(b) {
		b.chunks = (b.chunks || [this]).map(function(c) {
			return c === other ? this : c;
		}, this);
		b.chunkReason = reason;
		this.addBlock(b);
	}, this);
	other.blocks.length = 0;
	other.origins.forEach(function(origin) {
		if(!origin.reasons) {
			origin.reasons = [reason];
		} else if(origin.reasons[0] !== reason) {
			origin.reasons.unshift(reason);
		}
		this.origins.push(origin);
	}, this);
	return true;
};

Chunk.prototype.isEmpty = function() {
	return (this.modules.length === 0);
};

Chunk.prototype.updateHash = function(hash) {
	hash.update(this.id + " ");
	hash.update(this.ids ? this.ids.join(",") : "");
	hash.update(this.name + "");
	this.modules.forEach(function(m) {
		m.updateHash(hash);
	});
};

Chunk.prototype.size = function(options) {
	var CHUNK_OVERHEAD = options.chunkOverhead || 10000;
	var ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

	var modulesSize = this.modules.map(function(m) {
		return m.size();
	}).reduce(function(a, b) {
		return a + b;
	}, 0);
	return modulesSize * (this.initial ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
};

Chunk.prototype.canBeIntegrated = function(other) {
	if(other.initial) {
		return false;
	}
	if(this.initial) {
		if(other.parents.length !== 1 || other.parents[0] !== this) {
			return false;
		}
	}
	return true;
};

Chunk.prototype.integratedSize = function(other, options) {
	// Chunk if it's possible to integrate this chunks
	if(!this.canBeIntegrated(other)) {
		return false;
	}

	var CHUNK_OVERHEAD = options.chunkOverhead || 10000;
	var ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

	var mergedModules = this.modules.slice();
	other.modules.forEach(function(m) {
		if(this.modules.indexOf(m) < 0) {
			mergedModules.push(m);
		}
	}, this);

	var modulesSize = mergedModules.map(function(m) {
		return m.size();
	}).reduce(function(a, b) {
		return a + b;
	}, 0);
	return modulesSize * (this.initial || other.initial ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
};

Chunk.prototype.getChunkMaps = function(includeEntries) {
	var chunksProcessed = [];
	var chunkHashMap = {};
	var chunkNameMap = {};
	(function addChunk(c) {
		if(chunksProcessed.indexOf(c) >= 0) return;
		chunksProcessed.push(c);
		if(!c.entry || includeEntries) {
			chunkHashMap[c.id] = c.renderedHash;
			if(c.name)
				chunkNameMap[c.id] = c.name;
		}
		c.chunks.forEach(addChunk);
	}(this));
	return {
		hash: chunkHashMap,
		name: chunkNameMap
	};
};

Chunk.prototype.toString = function() {
	return "Chunk[" + this.modules.join() + "]";
};
