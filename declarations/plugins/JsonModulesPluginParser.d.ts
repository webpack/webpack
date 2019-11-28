/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export interface JsonModulesPluginParserOptions {
	/**
	 * Function that executes for a module source string and should return json-compatible string or JS object
	 */
	parse?: (
		input: string,
		module: import("../../lib/Module")
	) => string | object;
}
