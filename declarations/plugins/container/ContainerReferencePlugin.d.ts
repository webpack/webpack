/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Modules in this container that should override overridable modules in the remote container. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
 */
export type Overrides = (OverridesItem | OverridesObject)[] | OverridesObject;
/**
 * Request to a module in this container that should override overridable modules in the remote container.
 */
export type OverridesItem = string;
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

export interface ContainerReferencePluginOptions {
	/**
	 * Modules in this container that should override overridable modules in the remote container. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
	 */
	overrides?: Overrides;
	/**
	 * The external type of the remote containers.
	 */
	remoteType: LibraryType;
	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes: Remotes;
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
