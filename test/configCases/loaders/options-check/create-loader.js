"use strict";

const schema = /** @type {EXPECTED_ANY} */ (require("./loader.options.json"));

/**
 * @param {(options: EXPECTED_ANY) => boolean} check precompiled check of the schema
 * @returns {import("../../../../").LoaderDefinition<{ name: string }>} loader
 */
module.exports = (check) =>
	function loader() {
		/** @type {EXPECTED_ANY[]} */
		const checked = [];
		const options = this.getOptions(schema, (value) => {
			checked.push(value);
			return check(value);
		});

		return `module.exports = ${JSON.stringify({ options, checked })}`;
	};
