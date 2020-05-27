/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Modules that should be provided as shared modules to the share scope. When provided, property name is used as share key, otherwise share key is automatically inferred from request.
 */
export type Provides = (ProvidesItem | ProvidesObject)[] | ProvidesObject;
/**
 * Request to a module that should be provided as shared module to the share scope.
 */
export type ProvidesItem = string;
/**
 * Version number as array. Numbers and strings are accepted. Strings are treated as tags, which only match exactly. Numbers can match higher numbers.
 */
export type SharedVersionArray = (number | string)[];

export interface ProvideSharedPluginOptions {
	/**
	 * Modules that should be provided as shared modules to the share scope. When provided, property name is used as share key, otherwise share key is automatically inferred from request.
	 */
	provides: Provides;
	/**
	 * Share scope name used for all provided modules (defaults to 'default').
	 */
	shareScope?: string;
}
/**
 * Modules that should be provided as shared modules to the share scope. Property names are used as share keys.
 */
export interface ProvidesObject {
	/**
	 * Modules that should be provided as shared modules to the share scope.
	 */
	[k: string]: ProvidesConfig | ProvidesItem;
}
/**
 * Advanced configuration for modules that should be provided as shared modules to the share scope.
 */
export interface ProvidesConfig {
	/**
	 * Include the provided module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;
	/**
	 * Request to a module that should be provided as shared module to the share scope.
	 */
	import: ProvidesItem;
	/**
	 * Share scope name.
	 */
	shareScope?: string;
	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?: false | string | SharedVersionArray;
}
