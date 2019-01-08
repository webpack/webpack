"use stricts";

const resolveTargetName = (mainTemplate, name, chunk, hash) => {
	if (typeof name === "function") {
		name = name(chunk);
	}
	return mainTemplate.getAssetPath(name, {
		hash,
		chunk
	});
};

const updateHashPath = (compilation, name, paths) => {
	compilation.chunks.forEach(chunk => {
		if (chunk.hasEntryModule()) {
			name = resolveTargetName(
				compilation.mainTemplate,
				name,
				chunk,
				compilation.hash
			);
			if (name) {
				paths.push(name);
			}
		}
	});
};

module.exports = {
	resolveTargetName,
	updateHashPath
};
