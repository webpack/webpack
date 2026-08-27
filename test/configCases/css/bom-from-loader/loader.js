// Emulates sass-loader's production default (`outputStyle: "compressed"` with
// `charset: true`), which prefixes a BOM whenever the stylesheet is non-ASCII.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(content) {
	return `\uFEFF${content}`;
};
