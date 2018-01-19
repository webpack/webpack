// TODO remove this function
function assert(value, typeName, name) {
	const Type = require(`./${typeName}`);
	if(value instanceof Type) return;
	throw new Error(`${name} is not a ${Type.name}`);
}

exports.connectChunkGroupAndChunk = (chunkGroup, chunk) => {
	assert(chunkGroup, "ChunkGroup", "chunkGroup");
	assert(chunk, "Chunk", "chunk");
	if(chunkGroup.pushChunk(chunk)) {
		chunk.addGroup(chunkGroup);
	}
};

exports.connectChunkGroupParentAndChild = (parent, child) => {
	assert(parent, "ChunkGroup", "parent");
	assert(child, "ChunkGroup", "child");
	if(parent.addChild(child)) {
		child.addParent(parent);
	}
};

exports.connectChunkAndModule = (chunk, module) => {
	assert(chunk, "Chunk", "chunk");
	assert(module, "Module", "module");
	if(module.addChunk(chunk)) {
		chunk.addModule(module);
	}
};

exports.disconnectChunkAndModule = (chunk, module) => {
	assert(chunk, "Chunk", "chunk");
	assert(module, "Module", "module");
	chunk.removeModule(module);
	module.removeChunk(chunk);
};

exports.connectDependenciesBlockAndChunkGroup = (depBlock, chunkGroup) => {
	assert(depBlock, "DependenciesBlock", "depBlock");
	assert(chunkGroup, "ChunkGroup", "chunkGroup");
	if(chunkGroup.addBlock(depBlock)) {
		depBlock.chunkGroup = chunkGroup;
	}
};
