/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Modules that should be provided as shared modules to the share scope. When provided, property name is used to match modules, otherwise this is automatically inferred from share key.
 */
export type Provides = (ProvidesItem | ProvidesObject)[] | ProvidesObject;
/**
 * Request to a module that should be provided as shared module to the share scope (will be resolved when relative).
 */
export type ProvidesItem = string;

export interface ProvideSharedPluginOptions {
	/**
	 * Modules that should be provided as shared modules to the share scope. When provided, property name is used to match modules, otherwise this is automatically inferred from share key.
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
	 * Key in the share scope under which the shared modules should be stored.
	 */
	shareKey?: string;
	/**
	 * Share scope name.
	 */
	shareScope?: string;
	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?: false | string;
}
