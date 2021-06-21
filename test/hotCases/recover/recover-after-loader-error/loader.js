/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	if (source.indexOf("error") >= 0) throw new Error(source.trim());
	return source;
};
