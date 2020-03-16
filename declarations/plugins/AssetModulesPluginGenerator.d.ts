/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Function that executes for module and should return an DataUrl string.
 */
export type DataUrlFunction = (
	source: string | Buffer,
	context: {filename: string; module: import("../../lib/Module")}
) => string;

export interface AssetModulesPluginGeneratorOptions {
	/**
	 * The options for data url generator.
	 */
	dataUrl?: DataUrlOptions | DataUrlFunction;
	/**
	 * Template for asset filename.
	 */
	filename?:
		| string
		| ((
				pathData: import("../../lib/Compilation").PathData,
				assetInfo?: import("../../lib/Compilation").AssetInfo
		  ) => string);
}
/**
 * Options object for data url generation.
 */
export interface DataUrlOptions {
	/**
	 * Asset encoding (defaults to base64).
	 */
	encoding?: false | "base64";
	/**
	 * Asset mimetype (getting from file extension by default).
	 */
	mimetype?: string;
}
