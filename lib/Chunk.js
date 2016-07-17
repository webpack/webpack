/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var compareLocations = require("./compareLocations");
var debugId = 1000;

function Chunk(name, module, loc) {
	this.id = null;
	this.ids = null;
	this.debugId = debugId++;
	this.name = name;
	this.modules = [];
	this.entrypoints = [];
	this.chunks = [];
	this.parents = [];
	this.blocks = [];
	this.origins = [];
	this.files = [];
	this.rendered = false;
	if(module) {
		this.origins.push({
			module: module,
			loc: loc,
			name: name
		});
	}
}
module.exports = Chunk;

Object.defineProperty(Chunk.prototype, "entry", {
	configurable: false,
	get: function() {
		throw new Error("Chunk.entry was removed. Use hasRuntime()");
	},
	set: function() {
		throw new Error("Chunk.entry was removed. Use hasRuntime()");
	}
});

Object.defineProperty(Chunk.prototype, "initial", {
	configurable: false,
	get: function() {
		throw new Error("Chunk.initial was removed. Use isInitial()");
	},
	set: function() {
		throw new Error("Chunk.initial was removed. Use isInitial()");
	}
});

Chunk.prototype.hasRuntime = function() {
	if(this.entrypoints.length === 0) return false;
	return this.entrypoints[0].chunks[0] === this;
};

Chunk.prototype.isInitial = function() {
	return this.entrypoints.length > 0;
};

Chunk.prototype.hasEntryModule = function() {
	return !!this.entryModule;
};

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
	this.origins.push({
		module: module,
		loc: loc,
		name: this.name
	});
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

Chunk.prototype.moveModule = function(module, other) {
	module.removeChunk(this);
	module.addChunk(other);
	other.addModule(module);
	module.rewriteChunkInReasons(this, [other]);
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
		this.origins.push(origin);
	}, this);
	this.origins.forEach(function(origin) {
		if(!origin.reasons) {
			origin.reasons = [reason];
		} else if(origin.reasons[0] !== reason) {
			origin.reasons.unshift(reason);
		}
	});
	this.chunks = this.chunks.filter(function(c) {
		return c !== other && c !== this;
	});
	this.parents = this.parents.filter(function(c) {
		return c !== other && c !== this;
	});
	return true;
};

Chunk.prototype.split = function(newChunk) {
	var _this = this;
	this.blocks.forEach(function(b) {
		newChunk.blocks.push(b);
		b.chunks.push(newChunk);
	});
	this.chunks.forEach(function(c) {
		newChunk.chunks.push(c);
		c.parents.push(newChunk);
	});
	this.parents.forEach(function(p) {
		p.chunks.push(newChunk);
		newChunk.parents.push(p);
	});
	this.entrypoints.forEach(function(e) {
		e.insertChunk(newChunk, _this);
	});
};

Chunk.prototype.isEmpty = function() {
	return this.modules.length === 0;
};

Chunk.prototype.updateHash = function(hash) {
	hash.update(this.id + " ");
	hash.update(this.ids ? this.ids.join(",") : "");
	hash.update((this.name || "") + " ");
	this.modules.forEach(function(m) {
		m.updateHash(hash);
	});
};

Chunk.prototype.size = function(options) {
	var CHUNK_OVERHEAD = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
	var ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

	var modulesSize = this.modules.reduce(function(a, b) {
		return a + b.size();
	}, 0);
	return modulesSize * (this.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
};

Chunk.prototype.canBeIntegrated = function(other) {
	if(other.isInitial()) {
		return false;
	}
	if(this.isInitial()) {
		if(other.parents.length !== 1 || other.parents[0] !== this) {
			return false;
		}
	}
	return true;
};

Chunk.prototype.integratedSize = function(other, options) {
	// Chunk if it's possible to integrate this chunk
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

	var modulesSize = mergedModules.reduce(function(a, m) {
		return a + m.size();
	}, 0);
	return modulesSize * (this.isInitial() || other.isInitial() ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
};

Chunk.prototype.getChunkMaps = function(includeEntries, realHash) {
	var chunksProcessed = [];
	var chunkHashMap = {};
	var chunkNameMap = {};
	(function addChunk(c) {
		if(chunksProcessed.indexOf(c) >= 0) return;
		chunksProcessed.push(c);
		if(!c.hasRuntime() || includeEntries) {
			chunkHashMap[c.id] = realHash ? c.hash : c.renderedHash;
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

function byId(a, b) {
	return a.id - b.id;
}

Chunk.prototype.sortItems = function() {
	this.modules.sort(byId);
	this.origins.sort(function(a, b) {
		var aIdent = a.module.identifier();
		var bIdent = b.module.identifier();
		if(aIdent < bIdent) return -1;
		if(aIdent > bIdent) return 1;
		return compareLocations(a.loc, b.loc);
	});
	this.origins.forEach(function(origin) {
		if(origin.reasons)
			origin.reasons.sort();
	});
};

Chunk.prototype.toString = function() {
	return "Chunk[" + this.modules.join() + "]";
};

Chunk.prototype.checkConstraints = function() {
	var chunk = this;
	chunk.chunks.forEach(function(child, idx) {
		if(chunk.chunks.indexOf(child) !== idx)
			throw new Error("checkConstraints: duplicate child in chunk " + chunk.debugId + " " + child.debugId);
		if(child.parents.indexOf(chunk) < 0)
			throw new Error("checkConstraints: child missing parent " + chunk.debugId + " -> " + child.debugId);
	});
	chunk.parents.forEach(function(parent, idx) {
		if(chunk.parents.indexOf(parent) !== idx)
			throw new Error("checkConstraints: duplicate parent in chunk " + chunk.debugId + " " + parent.debugId);
		if(parent.chunks.indexOf(chunk) < 0)
			throw new Error("checkConstraints: parent missing child " + parent.debugId + " <- " + chunk.debugId);
	});
};
