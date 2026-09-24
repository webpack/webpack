/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyString } from "../vocabulary";

/**
 * The banner as function, it will be wrapped in a comment.
 */
export type BannerFunction =
	import("../../lib/output/BannerPlugin").BannerFunction;

/**
 * Filtering rule as regex or string.
 */
export type Rule =
	| RegExp
	| NonEmptyString
	| import("../../lib/devtool/ModuleFilenameHelpers").MatcherFn;

/**
 * Filtering rules.
 */
export type Rules = Array</** A rule condition. */ Rule> | Rule;

/**
 * @inline
 */
export interface BannerPluginOptions {
	/**
	 * Specifies the banner.
	 */
	banner: string | BannerFunction;
	/**
	 * If true, the banner will only be added to the entry chunks.
	 */
	entryOnly?: boolean;
	/**
	 * Exclude all modules matching any of these conditions.
	 */
	exclude?: Rules;
	/**
	 * If true, banner will be placed at the end of the output.
	 */
	footer?: boolean;
	/**
	 * Include all modules matching any of these conditions.
	 */
	include?: Rules;
	/**
	 * If true, banner will not be wrapped in a comment.
	 */
	raw?: boolean;
	/**
	 * Specifies the stage when add a banner.
	 */
	stage?: number;
	/**
	 * Include all modules that pass test assertion.
	 */
	test?: Rules;
}

/**
 * @schema
 */
export type BannerPluginArgument =
	| /** The banner as string, it will be wrapped in a comment. */ NonEmptyString
	| BannerPluginOptions
	| BannerFunction;
