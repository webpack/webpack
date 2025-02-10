/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return Promise.resolve(`module.exports = 'b';`);
};
