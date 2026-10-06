let counter = 0;

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function countLoader() {
	return `module.exports = ${counter++};`;
};
