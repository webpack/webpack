/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return source + 'module.exports += " loader1";\n';
};
