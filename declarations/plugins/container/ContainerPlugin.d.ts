/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
 */
export type Exposes = (ExposesItem | ExposesObject)[] | ExposesObject;
/**
 * Module that should be exposed by this container.
 */
export type ExposesItem = string;
/**
 * Modules that should be exposed by this container.
 */
export type ExposesItems = ExposesItem[];
/**
 * Add a comment in the UMD wrapper.
 */
export type AuxiliaryComment = string | LibraryCustomUmdCommentObject;
/**
 * Specify which export should be exposed as library.
 */
export type LibraryExport = string[] | string;
/**
 * The name of the library (some types allow unnamed libraries too).
 */
export type LibraryName = string[] | string | LibraryCustomUmdObject;
/**
 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
 */
export type LibraryType =
	| (
			| "var"
			| "module"
			| "assign"
			| "assign-properties"
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
			| "system"
	  )
	| string;
/**
 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
 */
export type UmdNamedDefine = boolean;

export interface ContainerPluginOptions {
	/**
	 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
	 */
	exposes: Exposes;
	/**
	 * The filename for this container relative path inside the `output.path` directory.
	 */
	filename?: string;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The name for this container.
	 */
	name: string;
	/**
	 * The name of the share scope which is shared with the host (defaults to 'default').
	 */
	shareScope?: string;
}
/**
 * Modules that should be exposed by this container. Property names are used as public paths.
 */
export interface ExposesObject {
	/**
	 * Modules that should be exposed by this container.
	 */
	[k: string]: ExposesConfig | ExposesItem | ExposesItems;
}
/**
 * Advanced configuration for modules that should be exposed by this container.
 */
export interface ExposesConfig {
	/**
	 * Request to a module that should be exposed by this container.
	 */
	import: ExposesItem | ExposesItems;
	/**
	 * Custom chunk name for the exposed module.
	 */
	name?: string;
}
/**
 * Options for library.
 */
export interface LibraryOptions {
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;
	/**
	 * Specify which export should be exposed as library.
	 */
	export?: LibraryExport;
	/**
	 * The name of the library (some types allow unnamed libraries too).
	 */
	name?: LibraryName;
	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
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
	 * Set comment for `amd` section in UMD.
	 */
	amd?: string;
	/**
	 * Set comment for `commonjs` (exports) section in UMD.
	 */
	commonjs?: string;
	/**
	 * Set comment for `commonjs2` (module.exports) section in UMD.
	 */
	commonjs2?: string;
	/**
	 * Set comment for `root` (global variable) section in UMD.
	 */
	root?: string;
}
/**
 * Description object for all UMD variants of the library name.
 */
export interface LibraryCustomUmdObject {
	/**
	 * Name of the exposed AMD library in the UMD.
	 */
	amd?: string;
	/**
	 * Name of the exposed commonjs export in the UMD.
	 */
	commonjs?: string;
	/**
	 * Name of the property exposed globally by a UMD library.
	 */
	root?: string[] | string;
}
