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
 * Type of library.
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
/**
 * Modules in this container that should be able to be overridden by the host. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
 */
export type Overridables =
	| (OverridablesItem | OverridablesObject)[]
	| OverridablesObject;
/**
 * Request to a module in this container that should be able to be overridden by the host.
 */
export type OverridablesItem = string;
/**
 * Requests to modules in this container that should be able to be overridden by the host.
 */
export type OverridablesItems = OverridablesItem[];
/**
 * Modules in this container that should override overridable modules in the remote container. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
 */
export type Overrides = (OverridesItem | OverridesObject)[] | OverridesObject;
/**
 * Request to a module in this container that should override overridable modules in the remote container.
 */
export type OverridesItem = string;
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
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import";
/**
 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
 */
export type Remotes = (RemotesItem | RemotesObject)[] | RemotesObject;
/**
 * Container location from which modules should be resolved and loaded at runtime.
 */
export type RemotesItem = string;
/**
 * Container locations from which modules should be resolved and loaded at runtime.
 */
export type RemotesItems = RemotesItem[];
/**
 * Modules that should be shared with remotes and/or host. When provided, property name is used as shared key, otherwise shared key is automatically inferred from request.
 */
export type Shared = (SharedItem | SharedObject)[] | SharedObject;
/**
 * Module that should be shared with remotes and/or host.
 */
export type SharedItem = string;

export interface ModuleFederationPluginOptions {
	/**
	 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
	 */
	exposes?: Exposes;
	/**
	 * The filename of the container as relative path inside the `output.path` directory.
	 */
	filename?: string;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The name of the container.
	 */
	name?: string;
	/**
	 * Modules in this container that should be able to be overridden by the host. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
	 */
	overridables?: Overridables;
	/**
	 * Modules in this container that should override overridable modules in the remote container. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
	 */
	overrides?: Overrides;
	/**
	 * The external type of the remote containers.
	 */
	remoteType?: ExternalsType;
	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes?: Remotes;
	/**
	 * Modules that should be shared with remotes and/or host. When provided, property name is used as shared key, otherwise shared key is automatically inferred from request.
	 */
	shared?: Shared;
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
	 * Type of library.
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
/**
 * Requests to modules in this container that should be able to be overridden by the host. Property names are used as override keys.
 */
export interface OverridablesObject {
	/**
	 * Requests to modules in this container that should be able to be overridden by the host.
	 */
	[k: string]: OverridablesConfig | OverridablesItem | OverridablesItems;
}
/**
 * Advanced configuration for modules in this container that should be able to be overridden by the host.
 */
export interface OverridablesConfig {
	/**
	 * Requests to modules in this container that should be able to be overridden by the host.
	 */
	import: OverridablesItem | OverridablesItems;
}
/**
 * Requests to modules in this container that should override overridable modules in the remote container. Property names are used as override keys.
 */
export interface OverridesObject {
	/**
	 * Requests to modules in this container that should override overridable modules in the remote container.
	 */
	[k: string]: OverridesConfig | OverridesItem;
}
/**
 * Advanced configuration for modules in this container that should override overridable modules in the remote container.
 */
export interface OverridesConfig {
	/**
	 * Request to a module in this container that should override overridable modules in the remote container.
	 */
	import: OverridesItem;
}
/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 */
export interface RemotesObject {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	[k: string]: RemotesConfig | RemotesItem | RemotesItems;
}
/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 */
export interface RemotesConfig {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	external: RemotesItem | RemotesItems;
}
/**
 * Modules that should be shared with remotes and/or host. Property names are used as shared keys.
 */
export interface SharedObject {
	/**
	 * Modules that should be shared with remotes and/or host.
	 */
	[k: string]: SharedConfig | SharedItem;
}
/**
 * Advanced configuration for modules that should be shared with remotes and/or host.
 */
export interface SharedConfig {
	/**
	 * Module that should be shared with remotes and/or host.
	 */
	import: SharedItem;
}
