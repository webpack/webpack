/** @type {import("../../../../").LoaderDefinition<{ value: string }>} */
module.exports = function () {
	return `module.exports = ${JSON.stringify(this.getOptions().value)};`;
};
