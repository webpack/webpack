/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const util = require("util");

/** @typedef {import("../../declarations/WebpackOptions").GeneratorOptionsByModuleType} GeneratorOptionsByModuleType */
/** @typedef {import("../module/NormalModule").GeneratorOptions} GeneratorOptions */

/**
 * Warns when a module type that takes no generator options is given some by
 * a rule. `module.generator` is validated against each type's schema, but a
 * rule's `generator` never was. The options a `createGenerator` tap gets are
 * the rule's merged over `module.generator` for the type and each type it is
 * under (`asset` for `asset/source`), so a key whose value is the one that
 * merge brought in is not the rule's.
 * @param {string} type the module type the generator is created for
 * @param {GeneratorOptions} generatorOptions the options the tap was given
 * @param {GeneratorOptionsByModuleType | undefined} globalGeneratorOptions `module.generator`
 * @returns {void}
 */
const deprecateRuleGeneratorOptions = (
	type,
	generatorOptions,
	globalGeneratorOptions
) => {
	/** @type {GeneratorOptions[]} */
	const globals = [];
	if (globalGeneratorOptions) {
		let current = "";
		for (const part of type.split("/")) {
			current = current ? `${current}/${part}` : part;
			/** @type {GeneratorOptions | undefined} */
			const options = globalGeneratorOptions[current];
			if (typeof options === "object") {
				globals.push(options);
			}
		}
	}
	const fromRule = Object.keys(generatorOptions).filter(
		(key) =>
			!globals.some(
				(options) =>
					Object.prototype.hasOwnProperty.call(options, key) &&
					options[key] === generatorOptions[key]
			)
	);
	if (fromRule.length === 0) return;
	const given = fromRule.map((key) => `"${key}"`).join(", ");
	// TODO in the next major release: validate a rule's `generator` against the module type's schema and reject these options instead of warning
	util.deprecate(
		() => {},
		`The "${type}" module type takes no generator options, but a rule gives it ${given}. Remove them from the rule's \`generator\`; the next major release will reject them like \`module.generator\` does.`,
		"DEP_WEBPACK_RULE_GENERATOR_OPTIONS"
	)();
};

module.exports = deprecateRuleGeneratorOptions;
