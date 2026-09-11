/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = async function () {
	const requests = [
		"./style.module.css",
		"./style.module.css?exportsOnly",
		"./style.css?module",
		"./style.css?module&exportsOnly"
	];
	/** @type {Record<string, EXPECTED_ANY>} */
	const result = {};
	for (const request of requests) {
		const exports = await this.importModule(request);
		result[request] = { button: exports.button, title: exports.title };
	}
	return `module.exports = ${JSON.stringify(result)};`;
};
