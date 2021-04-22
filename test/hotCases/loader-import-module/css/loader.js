/** @type {import("../../../../").PitchLoaderDefinitionFunction} */
exports.pitch = async function (remaining) {
	const result = await this.importModule(
		this.resourcePath + ".webpack[javascript/auto]" + "!=!" + remaining
	);
	return (result.default || result)();
};
