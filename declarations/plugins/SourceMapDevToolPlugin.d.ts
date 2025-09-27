/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

/**
 * Include source maps for modules based on their extension (defaults to .js and .css).
 */
export type Rules = Rule[] | Rule;
/**
 * Include source maps for modules based on their extension (defaults to .js and .css).
 */
export type Rule = RegExp | string | ((str: string) => boolean);

export interface SourceMapDevToolPluginOptions {
	/**
	 * Appends the given value to the original asset. Usually the #sourceMappingURL comment. [url] is replaced with a URL to the source map file. false disables the appending.
	 */
	append?:
		| (false | null)
		| string
		| import("../../lib/TemplatedPathPlugin").TemplatePathFn;
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
		| string
		| import("../../lib/ModuleFilenameHelpers").ModuleFilenameTemplateFunction;
	/**
	 * Path prefix to which the [file] placeholder is relative to.
	 */
	fileContext?: string;
	/**
	 * Defines the output filename of the SourceMap (will be inlined if no value is provided).
	 */
	filename?: (false | null) | string;
	/**
	 * Decide whether to ignore source files that match the specified value in the SourceMap.
	 */
	ignoreList?: Rule[] | Rule;
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
		| string
		| import("../../lib/ModuleFilenameHelpers").ModuleFilenameTemplateFunction;
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
