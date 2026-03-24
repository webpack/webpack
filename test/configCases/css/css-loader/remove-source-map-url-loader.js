/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(content) {
	return content.replace(/\/[*/][#]?\s*sourceMappingURL=.+(\*\/)?/g, "");
};
