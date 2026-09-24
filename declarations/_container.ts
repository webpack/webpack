/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyString } from "./vocabulary";

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
