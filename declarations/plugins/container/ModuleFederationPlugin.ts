/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import {
	type DottedIdentifier,
	type NonEmptyString,
	type RelativePath
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
 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
 */
export type ExternalsType =
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
	| "commonjs-static"
	| "amd"
	| "amd-require"
	| "amd-async"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import"
	| "module-import"
	| "script"
	| "node-commonjs"
	| "asset"
	| "asset-url"
	| "css-import"
	| "css-url";

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
 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
 */
export type Remotes =
	| Array<
			| /** Container locations and request scopes from which modules should be resolved and loaded at runtime. */ RemotesItem
			| RemotesObject
	  >
	| RemotesObject;

/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 */
export interface RemotesConfig {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	external: RemotesItem | RemotesItems;
	/**
	 * The name of the share scope shared with this remote.
	 */
	shareScope?: NonEmptyString;
}

/**
 * Container location from which modules should be resolved and loaded at runtime.
 */
export type RemotesItem = NonEmptyString;

/**
 * Container locations from which modules should be resolved and loaded at runtime.
 */
export type RemotesItems = RemotesItem[];

/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 */
export type RemotesObject = {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	[key: string]: RemotesConfig | RemotesItem | RemotesItems;
};

/**
 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
 */
export type Shared =
	| Array<
			| /** Modules that should be shared in the share scope. */ SharedItem
			| SharedObject
	  >
	| SharedObject;

/**
 * Advanced configuration for modules that should be shared in the share scope.
 */
export interface SharedConfig {
	/**
	 * Include the provided and fallback module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;
	/**
	 * Provided module that should be provided to share scope. Also acts as fallback module if no shared module is found in share scope or version isn't valid. Defaults to the property name.
	 */
	import?: /** No provided or fallback module. */ false | SharedItem;
	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: NonEmptyString;
	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?:
		| /** No version requirement check. */ false
		| /** Version as string. Can be prefixed with '^' or '~' for minimum matches. Each part of the version should be separated by a dot '.'. */ string;
	/**
	 * Module is looked up under this key from the share scope.
	 */
	shareKey?: NonEmptyString;
	/**
	 * Share scope name.
	 */
	shareScope?: NonEmptyString;
	/**
	 * Allow only a single version of the shared module in share scope (disabled by default).
	 */
	singleton?: boolean;
	/**
	 * Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
	 */
	strictVersion?: boolean;
	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?:
		| /** Don't provide a version. */ false
		| /** Version as string. Each part of the version should be separated by a dot '.'. */ string;
}

/**
 * A module that should be shared in the share scope.
 */
export type SharedItem = NonEmptyString;

/**
 * Modules that should be shared in the share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 */
export type SharedObject = {
	/**
	 * Modules that should be shared in the share scope.
	 */
	[key: string]: SharedConfig | SharedItem;
};

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
 * @schema
 */
export interface ModuleFederationPluginOptions {
	/**
	 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
	 */
	exposes?: Exposes;
	/**
	 * The filename of the container as relative path inside the `output.path` directory.
	 */
	filename?: RelativePath;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The name of the container.
	 */
	name?: string;
	/**
	 * The external type of the remote containers.
	 */
	remoteType?: ExternalsType;
	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes?: Remotes;
	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: EntryRuntime;
	/**
	 * Share scope name used for all shared modules (defaults to 'default').
	 */
	shareScope?: NonEmptyString;
	/**
	 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
	 */
	shared?: Shared;
}
