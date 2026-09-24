/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyString } from "../../vocabulary";

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
 * @schema
 */
export interface ContainerReferencePluginOptions {
	/**
	 * The external type of the remote containers.
	 */
	remoteType: ExternalsType;
	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes: Remotes;
	/**
	 * The name of the share scope shared with all remotes (defaults to 'default').
	 */
	shareScope?: NonEmptyString;
}
