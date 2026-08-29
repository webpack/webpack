/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	return `module.exports = ${JSON.stringify({
		startsWithBOM: source.charCodeAt(0) === 0xfeff,
		source
	})};`;
};
