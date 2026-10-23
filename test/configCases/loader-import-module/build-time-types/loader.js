"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = async function loader() {
	/**
	 * @param {string} request the request to execute at build time
	 * @returns {Promise<unknown>} its exports, with bytes as a plain array
	 */
	const load = async (request) => {
		const exports = await this.importModule(request);
		return exports instanceof Uint8Array ? Array.from(exports) : exports;
	};
	const file = path.join(this.context, "file.txt");
	/** @type {Record<string, unknown>} */
	const values = {};
	for (const type of [
		"asset",
		"asset/inline",
		"asset/resource",
		"asset/source",
		"asset/bytes"
	]) {
		values[type] = await load(`${file}.webpack[${type}]!=!${file}`);
	}
	values.plain = typeof (await load("./plain.css"));
	values.text = await load("./text.css?text");
	values.image = await load("./image.png");
	values.source = await load("./source.txt");
	return `export default ${JSON.stringify(values)};`;
};
