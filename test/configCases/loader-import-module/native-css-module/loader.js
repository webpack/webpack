/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = async function (source) {
	const classes = await this.importModule("./style.module.css");
	return `const classes = ${JSON.stringify(classes)};\n${source}`;
};
