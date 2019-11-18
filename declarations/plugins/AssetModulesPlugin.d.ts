/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Function that executes for module source abd resource and should return new module source
 *
 * This interface was referenced by `AssetModulesPluginOptions`'s JSON-Schema
 * via the `definition` "DataUrlFn".
 */
export type DataUrlFn = (
	source: string | Buffer,
	resourcePath: string
) => string | Buffer | null;

export interface AssetModulesPluginOptions {
	/**
	 * The options for data url generator
	 */
	dataUrl?: false | DataUrlOptions | DataUrlFn;
}
/**
 * This interface was referenced by `AssetModulesPluginOptions`'s JSON-Schema
 * via the `definition` "DataUrlOptions".
 */
export interface DataUrlOptions {
	/**
	 * Module output encoding
	 */
	encoding?: false | "base64";
	/**
	 * Maximum size of files that should be inline as modules. Default: 8kb
	 */
	maxSize?: number;
	/**
	 * Module output mimetype (getting from file ext by default)
	 */
	mimetype?: string;
}
