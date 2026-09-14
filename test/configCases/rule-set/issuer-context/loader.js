/** @type {import("../../../../").LoaderDefinition<{ tag: string }>} */
module.exports = function (source) {
	const { tag } = /** @type {{ tag: string }} */ (this.getOptions());
	return `module.exports = ${JSON.stringify(`${tag}:${source.trim()}`)};`;
};
