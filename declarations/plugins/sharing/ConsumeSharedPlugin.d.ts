/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Modules that should be consumed from share scope. When provided, property names are used to match requested modules in this compilation.
 */
export type Consumes = (ConsumesItem | ConsumesObject)[] | ConsumesObject;
/**
 * A module that should be consumed from share scope.
 */
export type ConsumesItem = string;

/**
 * Options for consuming shared modules.
 */
export interface ConsumeSharedPluginOptions {
	/**
	 * Modules that should be consumed from share scope. When provided, property names are used to match requested modules in this compilation.
	 */
	consumes: Consumes;
	/**
	 * Share scope name used for all consumed modules (defaults to 'default').
	 */
	shareScope?: string;
}
/**
 * Modules that should be consumed from share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 */
export interface ConsumesObject {
	/**
	 * Modules that should be consumed from share scope.
	 */
	[k: string]: ConsumesConfig | ConsumesItem;
}
/**
 * Advanced configuration for modules that should be consumed from share scope.
 */
export interface ConsumesConfig {
	/**
	 * Include the fallback module directly instead behind an async request. This allows to use fallback module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;
	/**
	 * Fallback module if no shared module is found in share scope. Defaults to the property name.
	 */
	import?: false | ConsumesItem;
	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: string;
	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?: false | string;
	/**
	 * Module is looked up under this key from the share scope.
	 */
	shareKey?: string;
	/**
	 * Share scope name.
	 */
	shareScope?: string;
	/**
	 * Allow only a single version of the shared module in share scope (disabled by default).
	 */
	singleton?: boolean;
	/**
	 * Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
	 */
	strictVersion?: boolean;
}
