/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * The shortcut of the command
 */
export type Alias = string;
/**
 * Link to the documentation.
 */
export type DefaultValue = string | number | boolean | Function;
/**
 * Description of the flag
 */
export type Description = string;
/**
 * Link to the documentation.
 */
export type Link = string;
/**
 * The name of the flag
 */
export type Name = string;
/**
 * The typology of the flag. Using a function can force also a validation.
 */
export type Type = Function;
/**
 * Shows how to use the flag.
 */
export type Usage = string;

/**
 * webpack flags
 */
export interface WebpackFlags {
	/**
	 * The shortcut of the command
	 */
	alias?: Alias;
	/**
	 * Link to the documentation.
	 */
	defaultValue?: DefaultValue;
	/**
	 * Description of the flag
	 */
	description?: Description;
	/**
	 * Link to the documentation.
	 */
	link?: Link;
	/**
	 * The name of the flag
	 */
	name: Name;
	/**
	 * The typology of the flag. Using a function can force also a validation.
	 */
	type?: Type;
	/**
	 * Shows how to use the flag.
	 */
	usage?: Usage;
	[k: string]: any;
}
