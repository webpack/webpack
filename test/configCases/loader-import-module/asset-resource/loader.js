"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction<{ type: string }>} */
module.exports = async function loader() {
	const { type } = this.getOptions();
	const url = await this.importModule(
		`${this.resourcePath}.webpack[${type}]!=!${this.resourcePath}`
	);
	return `export default ${JSON.stringify(url)};`;
};
