/** @type {import("../../../../..").LoaderDefinitionFunction} */
module.exports = async function () {
	const result = await this.importModule("./choice");
	return `module.exports = ${JSON.stringify(result)};`;
};
