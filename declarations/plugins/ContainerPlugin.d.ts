/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Add a comment in the UMD wrapper.
 */
export type AuxiliaryComment = string | LibraryCustomUmdCommentObject;
/**
 * Specify which export should be exposed as library
 */
export type LibraryExport = string | ArrayOfStringValues;
/**
 * Array of strings
 */
export type ArrayOfStringValues = string[];
/**
 * The name of the library (some types allow unnamed libraries too)
 */
export type LibraryName = string | string[] | LibraryCustomUmdObject;
/**
 * Type of library
 */
export type LibraryType =
	| "var"
	| "module"
	| "assign"
	| "this"
	| "window"
	| "self"
	| "global"
	| "commonjs"
	| "commonjs2"
	| "commonjs-module"
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system";
/**
 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
 */
export type UmdNamedDefine = boolean;

export interface ContainerPluginOptions {
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
	 * Options for library
	 */
	library?: LibraryOptions;
	/**
	 * The name for this container
	 */
	name: string;
	/**
	 * An object for requests to override from host to this container
	 */
	overridables?:
		| {
				[k: string]: any;
		  }
		| any[];
}
/**
 * Options for library
 */
export interface LibraryOptions {
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;
	/**
	 * Specify which export should be exposed as library
	 */
	export?: LibraryExport;
	/**
	 * The name of the library (some types allow unnamed libraries too)
	 */
	name?: LibraryName;
	/**
	 * Type of library
	 */
	type: LibraryType;
	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: UmdNamedDefine;
}
/**
 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
 */
export interface LibraryCustomUmdCommentObject {
	/**
	 * Set comment for `amd` section in UMD
	 */
	amd?: string;
	/**
	 * Set comment for `commonjs` (exports) section in UMD
	 */
	commonjs?: string;
	/**
	 * Set comment for `commonjs2` (module.exports) section in UMD
	 */
	commonjs2?: string;
	/**
	 * Set comment for `root` (global variable) section in UMD
	 */
	root?: string;
}
/**
 * Description object for all UMD variants of the library name
 */
export interface LibraryCustomUmdObject {
	/**
	 * Name of the exposed AMD library in the UMD
	 */
	amd?: string;
	/**
	 * Name of the exposed commonjs export in the UMD
	 */
	commonjs?: string;
	/**
	 * Name of the property exposed globally by a UMD library
	 */
	root?: string | ArrayOfStringValues;
}
