// Emulates a loader whose tool prepends a BOM to its string output, the way
// dart-sass does for non-ASCII `compressed` output.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	return `\uFEFF${source}`;
};
