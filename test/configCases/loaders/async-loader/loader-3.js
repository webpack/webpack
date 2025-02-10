/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	const callback = this.async();

	callback(null, `module.exports = 'c';`);
};
