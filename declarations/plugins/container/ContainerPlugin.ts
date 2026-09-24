/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import {
	type DottedIdentifier,
	type NonEmptyRelativePath,
	type NonEmptyString
} from "../../vocabulary";

/**
 * Add a container for define/require functions in the AMD module.
 */
export type AmdContainer = NonEmptyString;

/**
 * Add a comment in the UMD wrapper.
 */
export type AuxiliaryComment =
	| /** Append the same comment above each import style. */ string
	| LibraryCustomUmdCommentObject;

/**
 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
 */
export type EntryRuntime = false | NonEmptyString;

/**
 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
 */
export type Exposes =
	| Array<
			| /** Modules that should be exposed by this container. */ ExposesItem
			| ExposesObject
	  >
	| ExposesObject;

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
 * Module that should be exposed by this container.
 */
export type ExposesItem = NonEmptyString;

/**
 * Modules that should be exposed by this container.
 */
export type ExposesItems = ExposesItem[];

/**
 * Modules that should be exposed by this container. Property names are used as public paths.
 */
export type ExposesObject = {
	/**
	 * Modules that should be exposed by this container.
	 */
	[key: string]: ExposesConfig | ExposesItem | ExposesItems;
};

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
	amd?: NonEmptyString;
	/**
	 * Name of the exposed commonjs export in the UMD.
	 */
	commonjs?: NonEmptyString;
	/**
	 * Name of the property exposed globally by a UMD library.
	 */
	root?:
		| Array</** Part of the name of the property exposed globally by a UMD library. */ NonEmptyString>
		| NonEmptyString;
}

/**
 * Which modules of an entry the library exposes the exports of: only the last one, or all of them, where a name more than one module binds differently is left out, as 'export *' does.
 * @since 5.112.0
 */
export type LibraryEntryExports = "last" | "all";

/**
 * Specify which export should be exposed as library.
 */
export type LibraryExport =
	| Array</** Part of the export that should be exposed as library. */ NonEmptyString>
	| NonEmptyString;

/**
 * The name of the library (some types allow unnamed libraries too).
 */
export type LibraryName =
	| /** @minItems 1 */ Array</** A part of the library name. */ NonEmptyString>
	| NonEmptyString
	| LibraryCustomUmdObject;

/**
 * Options for library.
 */
export interface LibraryOptions {
	/**
	 * Add a container for define/require functions in the AMD module.
	 */
	amdContainer?: AmdContainer;
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;
	/**
	 * Which modules of an entry the library exposes the exports of: only the last one, or all of them, where a name more than one module binds differently is left out, as 'export *' does.
	 * @since 5.112.0
	 */
	entryExports?: LibraryEntryExports;
	/**
	 * Specify which export should be exposed as library.
	 */
	export?: LibraryExport;
	/**
	 * The name of the library (some types allow unnamed libraries too).
	 */
	name?: LibraryName;
	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
	 */
	type: LibraryType;
	/**
	 * Add a branch to the UMD wrapper for an AMD-style loader exposing `define` on a container object, given as a dot-separated path, after the `define.amd` branch.
	 * @since 5.110.0
	 */
	umdAmdContainer?: UmdAmdContainer;
	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: UmdNamedDefine;
}

/**
 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
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
			| "commonjs-static"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system"
	  )
	| string;

/**
 * Add a branch to the UMD wrapper for an AMD-style loader exposing `define` on a container object, given as a dot-separated path, after the `define.amd` branch.
 * @since 5.110.0
 */
export type UmdAmdContainer = DottedIdentifier;

/**
 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
 */
export type UmdNamedDefine = boolean;

/**
 * @required name, exposes
 * @schema
 */
export interface ContainerPluginOptions {
	/**
	 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
	 */
	exposes: Exposes;
	/**
	 * The filename for this container relative path inside the `output.path` directory.
	 */
	filename?: NonEmptyRelativePath;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The name for this container.
	 */
	name: NonEmptyString;
	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: EntryRuntime;
	/**
	 * The name of the share scope which is shared with the host (defaults to 'default').
	 */
	shareScope?: NonEmptyString;
}
