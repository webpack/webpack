"use strict";

const schema = /** @type {EXPECTED_ANY} */ (require("./loader.options.json"));

/**
 * @param {(options: EXPECTED_ANY) => boolean} check precompiled check of the schema
 * @param {boolean=} lazy pass a function returning the schema rather than the schema
 * @returns {import("../../../../").LoaderDefinition<{ name: string }>} loader
 */
module.exports = (check, lazy) =>
	function loader() {
		/** @type {EXPECTED_ANY[]} */
		const checked = [];
		// Validating reads the schema, so no read means `schema-utils` never ran
		let schemaRead = false;
		const recorded = new Proxy(schema, {
			get(target, key) {
				schemaRead = true;
				return Reflect.get(target, key);
			}
		});
		const options = this.getOptions(
			lazy
				? () => {
						schemaRead = true;
						return recorded;
					}
				: recorded,
			(value) => {
				checked.push(value);
				return check(value);
			}
		);

		return `module.exports = ${JSON.stringify({ options, checked, schemaRead })}`;
	};
