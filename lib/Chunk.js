/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Chunk(name) {
	this.id = null;
	this.ids = null;
	this.name = name;
	this.modules = [];
	this.chunks = [];
	this.parents = [];
	this.blocks = [];
	this.rendered = false;
}
module.exports = Chunk;

Chunk.prototype.addModule = function(module) {
	if(this.modules.indexOf(module) >= 0) return false;
	this.modules.push(module);
	return true;
};

Chunk.prototype.removeModule = function(module) {
	var idx = this.modules.indexOf(module);
	if(idx >= 0) {
		this.modules.splice(idx, 1);
		module.removeChunk(this);
	}
};

Chunk.prototype.addChunk = function(chunk) {
	if(chunk === this) return false;
	if(this.chunks.indexOf(chunk) >= 0) return false;
	this.chunks.push(chunk);
	return true;
};

Chunk.prototype.removeChunk = function(chunk) {
	var idx = this.chunks.indexOf(chunk);
	if(idx >= 0) {
		this.chunks.splice(idx, 1);
		chunk.removeParent(this);
	}
};

Chunk.prototype.addParent = function(chunk) {
	if(chunk === this) return false;
	if(this.parents.indexOf(chunk) >= 0) return false;
	this.parents.push(chunk);
	return true;
};

Chunk.prototype.removeParent = function(chunk) {
	var idx = this.parents.indexOf(chunk);
	if(idx >= 0) {
		this.parents.splice(idx, 1);
		chunk.removeChunk(this);
	}
};

Chunk.prototype.addBlock = function(block) {
	if(this.blocks.indexOf(block) >= 0) return false;
	this.blocks.push(block);
	return true;
};

Chunk.prototype.remove = function(reason) {
	// console.log("remove " + this.toString());
	this.modules.slice().forEach(function(m) {
		m.removeChunk(this);
	}, this);
	this.parents.forEach(function(c) {
		var idx = c.chunks.indexOf(this);
		if(idx >= 0)
			c.chunks.splice(idx, 1);
		this.chunks.forEach(function(cc) {
			cc.addParent(c);
		});
	}, this);
	this.chunks.forEach(function(c) {
		var idx = c.parents.indexOf(this);
		if(idx >= 0)
			c.parents.splice(idx, 1);
		this.parents.forEach(function(cc) {
			cc.addChunk(c);
		});
	}, this);
	this.blocks.forEach(function(b) {
		b.chunk = null;
		b.chunkReason = reason;
	}, this);
};

Chunk.prototype.integrate = function(other, reason) {
	// console.log("integrate " + other.toString() + " into " + this.toString());
	var otherModules = other.modules.slice();
	otherModules.forEach(function(m) {
		m.removeChunk(other);
		m.addChunk(this);
		this.addModule(m);
	}, this);
	other.modules.length = 0;
	other.parents.forEach(function(c) {
		var idx = c.chunks.indexOf(other);
		if(idx >= 0)
			c.chunks.splice(idx, 1);
		if(c !== this && this.addParent(c))
			c.addChunk(this);
	}, this);
	other.parents.length = 0;
	other.chunks.forEach(function(c) {
		var idx = c.parents.indexOf(other);
		if(idx >= 0)
			c.parents.splice(idx, 1);
		if(c !== this && this.addChunk(c))
			c.addParent(this);
	}, this);
	other.chunks.length = 0;
	other.blocks.forEach(function(b) {
		b.chunk = this;
		b.chunkReason = reason;
		this.addBlock(b);
	}, this);
	other.blocks.length = 0;
};

Chunk.prototype.isEmpty = function() {
	return (this.modules.length == 0);
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
	return modulesSize * (this.entry ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
};

Chunk.prototype.integratedSize = function(other, options) {
	var CHUNK_OVERHEAD = options.chunkOverhead || 10000;
	var ENTRY_CHUNK_MULTIPLICATOR = options.entryChunkMultiplicator || 10;

	var mergedModules = this.modules.slice();
	other.modules.forEach(function(m) {
		if(this.modules.indexOf(m) < 0)
			mergedModules.push(m);
	}, this);

	var modulesSize = mergedModules.map(function(m) {
		return m.size();
	}).reduce(function(a, b) {
		return a + b;
	}, 0);
	return modulesSize * (this.entry || other.entry ? ENTRY_CHUNK_MULTIPLICATOR : 1) + CHUNK_OVERHEAD;
};

Chunk.prototype.toString = function() {
	return "Chunk[" + this.modules.join() + "]";
};