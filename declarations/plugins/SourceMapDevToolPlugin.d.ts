/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * This interface was referenced by `SourceMapDevToolPlugin`'s JSON-Schema
 * via the `definition` "rules".
 */
export type Rules = Rule[] | Rule;
/**
 * This interface was referenced by `SourceMapDevToolPlugin`'s JSON-Schema
 * via the `definition` "rule".
 */
export type Rule =
	| {
			[k: string]: any;
	  }
	| string;

export interface SourceMapDevToolPlugin {
	/**
	 * Include source maps for modules based on their extension (defaults to .js and .css)
	 */
	test?: Rules;
	/**
	 * Include source maps for module paths that match the given value
	 */
	include?: Rules;
	/**
	 * Exclude modules that match the given value from source map generation
	 */
	exclude?: Rules;
	/**
	 * Defines the output filename of the SourceMap (will be inlined if no value is provided)
	 */
	filename?: (false | null) | string;
	/**
	 * Appends the given value to the original asset. Usually the #sourceMappingURL comment. [url] is replaced with a URL to the source map file. false disables the appending
	 */
	append?: (false | null) | string;
	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap
	 */
	moduleFilenameTemplate?:
		| {
				[k: string]: any;
		  }
		| string;
	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap used only if 'moduleFilenameTemplate' would result in a conflict
	 */
	fallbackModuleFilenameTemplate?:
		| {
				[k: string]: any;
		  }
		| string;
	/**
	 * Namespace prefix to allow multiple webpack roots in the devtools
	 */
	namespace?: string;
	/**
	 * Indicates whether SourceMaps from loaders should be used (defaults to true)
	 */
	module?: boolean;
	/**
	 * Indicates whether column mappings should be used (defaults to true)
	 */
	columns?: boolean;
	/**
	 * Omit the 'sourceContents' array from the SourceMap
	 */
	noSources?: boolean;
	/**
	 * Provide a custom value for the 'sourceRoot' property in the SourceMap
	 */
	sourceRoot?: string;
	/**
	 * Provide a custom public path for the SourceMapping comment
	 */
	publicPath?: string;
	/**
	 * Path prefix to which the [file] placeholder is relative to
	 */
	fileContext?: string;
	/**
	 * (deprecated) try to map original files line to line to generated files
	 */
	lineToLine?:
		| boolean
		| {
				/**
				 * Include source maps for modules based on their extension (defaults to .js and .css)
				 */
				test?: Rules;
				/**
				 * Include source maps for module paths that match the given value
				 */
				include?: Rules;
				/**
				 * Exclude modules that match the given value from source map generation
				 */
				exclude?: Rules;
		  };
}
