/** @type {import("../../../../").LoaderDefinition<{ value: any }>} */
module.exports = function loader(content) {
	return content.replace(/test/, "NEW");
};
