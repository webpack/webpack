/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyRelativePath, type NonEmptyString } from "../vocabulary";

/**
 * Condition used to match resource (string, RegExp or Function).
 */
export type Rule =
	| RegExp
	| NonEmptyString
	| import("../../lib/devtool/ModuleFilenameHelpers").MatcherFn;

/**
 * One or multiple conditions used to match resource.
 */
export type Rules = Array</** A rule condition. */ Rule> | Rule;

/**
 * @schema
 */
export interface SourceMapDevToolPluginOptions {
	/**
	 * Appends the given value to the original asset. Usually the #sourceMappingURL comment. [url] is replaced with a URL to the source map file. false disables the appending.
	 */
	append?:
		| /** Append no SourceMap comment to the bundle, but still generate SourceMaps. */ (
				false | null
		  )
		| NonEmptyString
		| import("../../lib/template/TemplatedPathPlugin").TemplatePathFn;
	/**
	 * Indicates whether column mappings should be used (defaults to true).
	 */
	columns?: boolean;
	/**
	 * Emit debug IDs into source and SourceMap.
	 */
	debugIds?: boolean;
	/**
	 * Exclude modules that match the given value from source map generation.
	 */
	exclude?: Rules;
	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap used only if 'moduleFilenameTemplate' would result in a conflict.
	 */
	fallbackModuleFilenameTemplate?:
		| NonEmptyString
		| /** Custom function generating the identifier. */ import("../../lib/devtool/ModuleFilenameHelpers").ModuleFilenameTemplateFunction;
	/**
	 * Path prefix to which the [file] placeholder is relative to.
	 */
	fileContext?: string;
	/**
	 * Defines the output filename of the SourceMap (will be inlined if no value is provided).
	 */
	filename?:
		| /** Disable separate SourceMap file and inline SourceMap as DataUrl. */ (
				false | null
		  )
		| NonEmptyRelativePath;
	/**
	 * Decide whether to ignore source files that match the specified value in the SourceMap.
	 */
	ignoreList?: Rules;
	/**
	 * Include source maps for module paths that match the given value.
	 */
	include?: Rules;
	/**
	 * Indicates whether SourceMaps from loaders should be used (defaults to true).
	 */
	module?: boolean;
	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap.
	 */
	moduleFilenameTemplate?:
		| NonEmptyString
		| /** Custom function generating the identifier. */ import("../../lib/devtool/ModuleFilenameHelpers").ModuleFilenameTemplateFunction;
	/**
	 * Namespace prefix to allow multiple webpack roots in the devtools.
	 */
	namespace?: string;
	/**
	 * Omit the 'sourceContents' array from the SourceMap.
	 */
	noSources?: boolean;
	/**
	 * Provide a custom public path for the SourceMapping comment.
	 */
	publicPath?: string;
	/**
	 * Provide a custom value for the 'sourceRoot' property in the SourceMap.
	 */
	sourceRoot?: string;
	/**
	 * Include source maps for modules based on their extension (defaults to .js and .css).
	 */
	test?: Rules;
}
