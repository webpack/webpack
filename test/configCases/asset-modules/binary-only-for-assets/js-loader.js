/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	this.callback(null, source, {
		version: 3,
		file: "value.js",
		sources: ["original-value.js"],
		sourcesContent: ["export default 42;\n"],
		names: [],
		mappings: "AAAA"
	});
};
