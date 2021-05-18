let counter = 0;

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return `module.exports = ${counter++};`;
};
