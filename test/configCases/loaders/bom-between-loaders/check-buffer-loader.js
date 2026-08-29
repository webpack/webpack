/** @type {import("../../../../").RawLoaderDefinition} */
const loader = function loader(source) {
	return `module.exports = ${JSON.stringify({
		startsWithBOM:
			source[0] === 0xef && source[1] === 0xbb && source[2] === 0xbf,
		source: source.toString("utf8")
	})};`;
};

loader.raw = true;

module.exports = loader;
