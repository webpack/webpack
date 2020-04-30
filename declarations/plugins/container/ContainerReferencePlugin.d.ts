/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Modules in this container that should override overridable modules in the remote container. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
 */
export type Overrides =
	| Overrides[]
	| string
	| {
			[k: string]: Overrides;
	  };
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
export type Remotes =
	| Remotes[]
	| string
	| {
			[k: string]: Remotes;
	  };

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
