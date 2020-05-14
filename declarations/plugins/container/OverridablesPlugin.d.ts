/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

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
 * Modules that should be able to be overridden. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
 */
export interface OverridablesPluginOptions {
	/**
	 * Modules in this container that should be able to be overridden by the host. When provided, property name is used as override key, otherwise override key is automatically inferred from request.
	 */
	overridables?: Overridables;
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
