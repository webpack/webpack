/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();

	callback(null, `module.exports = 'c';`);
};
