/** @type {import("../../../../").LoaderDefinition<{ f(): any }>} */
module.exports = function (source) {
	return `${source}, World!`;
};
