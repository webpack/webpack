/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export interface JsonModulesPluginParserOptions {
	/**
	 * The depth of json dependency flagged as `exportInfo`.
	 */
	exportsDepth?: number;
	/**
	 * Function that executes for a module source string and should return json-compatible data.
	 */
	parse?: (input: string) => any;
}
