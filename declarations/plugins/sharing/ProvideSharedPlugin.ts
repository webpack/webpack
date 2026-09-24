/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyString } from "../../vocabulary";

/**
 * Modules that should be provided as shared modules to the share scope. When provided, property name is used to match modules, otherwise this is automatically inferred from share key.
 */
export type Provides =
	| Array<
			| /** Modules that should be provided as shared modules to the share scope. */ ProvidesItem
			| ProvidesObject
	  >
	| ProvidesObject;

/**
 * Advanced configuration for modules that should be provided as shared modules to the share scope.
 */
export interface ProvidesConfig {
	/**
	 * Include the provided module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;
	/**
	 * Key in the share scope under which the shared modules should be stored.
	 */
	shareKey?: NonEmptyString;
	/**
	 * Share scope name.
	 */
	shareScope?: NonEmptyString;
	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?:
		| /** Don't provide a version. */ false
		| /** Version as string. Each part of the version should be separated by a dot '.'. */ string;
}

/**
 * Request to a module that should be provided as shared module to the share scope (will be resolved when relative).
 */
export type ProvidesItem = NonEmptyString;

/**
 * Modules that should be provided as shared modules to the share scope. Property names are used as share keys.
 */
export type ProvidesObject = {
	/**
	 * Modules that should be provided as shared modules to the share scope.
	 */
	[key: string]: ProvidesConfig | ProvidesItem;
};

/**
 * @schema
 */
export interface ProvideSharedPluginOptions {
	/**
	 * Modules that should be provided as shared modules to the share scope. When provided, property name is used to match modules, otherwise this is automatically inferred from share key.
	 */
	provides: Provides;
	/**
	 * Share scope name used for all provided modules (defaults to 'default').
	 */
	shareScope?: NonEmptyString;
}
