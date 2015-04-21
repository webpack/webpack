/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function RecordIdsPlugin() {
}
module.exports = RecordIdsPlugin;

function makeRelative(compiler, identifier) {
	var context = compiler.context;
	return identifier.split("|").map(function(str) {
		return path.relative(context, str);
	}).join("|");
}

RecordIdsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("record-modules", function(modules, records) {
			records.nextFreeModuleId = compilation.nextFreeModuleId;
			if(!records.modules) records.modules = {};
			if(!records.modules.byIdentifier) records.modules.byIdentifier = {};
			modules.forEach(function(module) {
				var identifier = makeRelative(compiler, module.identifier());
				records.modules.byIdentifier[identifier] = module.id;
			});
		});
		compilation.plugin("revive-modules", function(modules, records) {
			if(records.nextFreeModuleId)
				compilation.nextFreeModuleId = records.nextFreeModuleId;
			if(!records.modules || !records.modules.byIdentifier) return;
			var usedIds = {0: true};
			modules.forEach(function(module) {
				if(module.id !== null) return;
				var identifier = makeRelative(compiler, module.identifier());
				var id = records.modules.byIdentifier[identifier];
				if(id === undefined) return;
				if(usedIds[id]) return;
				usedIds[id] = true;
				module.id = id;
			});
		});
		
		function getDepBlockIdent(chunk, block) {
			var ident = [];
			if(block.chunks.length > 1)
				ident.push(block.chunks.indexOf(chunk));
			while(block.parent) {
				var p = block.parent;
				var idx = p.blocks.indexOf(block);
				var l = p.blocks.length - 1;
				ident.unshift(idx + "/" + l);
				block = block.parent;
			}
			if(!block.identifier) return null;
			ident.unshift(makeRelative(compiler, block.identifier()));
			return ident.join(":");
		}
		compilation.plugin("record-chunks", function(chunks, records) {
			records.nextFreeChunkId = compilation.nextFreeChunkId;
			if(!records.chunks) records.chunks = {};
			if(!records.chunks.byName) records.chunks.byName = {};
			if(!records.chunks.byBlocks) records.chunks.byBlocks = {};
			chunks.forEach(function(chunk) {
				var name = chunk.name;
				var blockIdents = chunk.blocks.map(getDepBlockIdent.bind(null, chunk)).filter(Boolean);
				if(name) records.chunks.byName[name] = chunk.id;
				blockIdents.forEach(function(blockIdent) {
					records.chunks.byBlocks[blockIdent] = chunk.id;
				});
			});
		});
		compilation.plugin("revive-chunks", function(chunks, records) {
			if(records.nextFreeChunkId)
				compilation.nextFreeChunkId = records.nextFreeChunkId;
			if(!records.chunks) return;
			var usedIds = {};
			if(records.chunks.byName) {
				chunks.forEach(function(chunk) {
					if(chunk.id !== null) return;
					if(!chunk.name) return;
					var id = records.chunks.byName[chunk.name];
					if(id === undefined) return;
					if(usedIds[id]) return;
					usedIds[id] = true;
					chunk.id = id;
				});
			}
			if(records.chunks.byBlocks) {
				var argumentedChunks = chunks.filter(function(chunk) {
					return chunk.id === null
				}).map(function(chunk) {
					return {
						chunk: chunk,
						blockIdents: chunk.blocks.map(getDepBlockIdent.bind(null, chunk)).filter(Boolean)
					}
				}).filter(function(arg) {
					return arg.blockIdents.length > 0;
				});
				var blockIdentsCount = {};
				argumentedChunks.forEach(function(arg, idx) {
					arg.blockIdents.forEach(function(blockIdent) {
						var id = records.chunks.byBlocks[blockIdent];
						if(typeof id !== "number") return;
						var accessor = id + ":" + idx;
						blockIdentsCount[accessor] = (blockIdentsCount[accessor] || 0) + 1;
					});
				});
				blockIdentsCount = Object.keys(blockIdentsCount).map(function(accessor) {
					return [blockIdentsCount[accessor]].concat(accessor.split(":").map(Number));
				}).sort(function(a, b) {
					return b[0] - a[0];
				})
				blockIdentsCount.forEach(function(arg) {
					var id = arg[1];
					if(usedIds[id]) return;
					var idx = arg[2];
					var chunk = argumentedChunks[idx].chunk;
					if(chunk.id !== null) return;
					usedIds[id] = true;
					chunk.id = id;
				});
			}
		});
	});
};
