/** @type {import("../../../../").LoaderDefinition}} */
module.exports = function () {
	return `module.exports = ${JSON.stringify(Boolean(this.hot))};`;
};
