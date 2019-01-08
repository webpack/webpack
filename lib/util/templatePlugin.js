"use stricts";

const evalName = (name, chunk) => {
	if (typeof name === "function") {
		name = name({ chunk });
	}
	return name;
};
const resolveTargetName = (mainTemplate, name, chunk, hash) => {
	name = evalName(name, chunk);
	return mainTemplate.getAssetPath(name, {
		hash,
		chunk
	});
};

const chunksIterator = (compilation, fn) => {
	compilation.chunks.forEach(chunk => {
		if (chunk.hasEntryModule()) {
			fn(chunk);
		}
	});
};

const updateHashPath = (compilation, name, paths) => {
	chunksIterator(compilation, chunk => {
		name = evalName(name, chunk);
		if (name) {
			paths.push(name);
		}
	});
};

module.exports = {
	chunksIterator,
	resolveTargetName,
	updateHashPath
};
