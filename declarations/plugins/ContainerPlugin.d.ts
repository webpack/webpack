/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export interface ContainerPlugin {
	/**
	 * A map of modules you wish to expose
	 */
	exposes?:
		| {
				[k: string]: any;
		  }
		| any[];
	/**
	 * The filename for this container relative path inside the `output.path` directory.
	 */
	filename?: string;
	/**
	 * Type of library
	 */
	libraryTarget?:
		| "var"
		| "this"
		| "window"
		| "self"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "system";
	/**
	 * The name for this container
	 */
	name: string;
	/**
	 * An object for requests to override from host to this container
	 */
	overridables?: {
		[k: string]: any;
	};
}
