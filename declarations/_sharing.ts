/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyString } from "./vocabulary";

/**
 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
 */
export type Shared =
	| Array<
			| /** Modules that should be shared in the share scope. */ SharedItem
			| SharedObject
	  >
	| SharedObject;

/**
 * Advanced configuration for modules that should be shared in the share scope.
 */
export interface SharedConfig {
	/**
	 * Include the provided and fallback module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;
	exclude?: SharedModuleFilter;
	/**
	 * Provided module that should be provided to share scope. Also acts as fallback module if no shared module is found in share scope or version isn't valid. Defaults to the property name.
	 */
	import?: /** No provided or fallback module. */ false | SharedItem;
	include?: SharedModuleFilter;
	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: NonEmptyString;
	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?:
		| /** No version requirement check. */ false
		| /** Version as string. Can be prefixed with '^' or '~' for minimum matches. Each part of the version should be separated by a dot '.'. */ string;
	/**
	 * Module is looked up under this key from the share scope.
	 */
	shareKey?: NonEmptyString;
	/**
	 * Share scope name.
	 */
	shareScope?: NonEmptyString;
	/**
	 * Allow only a single version of the shared module in share scope (disabled by default).
	 */
	singleton?: boolean;
	/**
	 * Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
	 */
	strictVersion?: boolean;
	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?:
		| /** Don't provide a version. */ false
		| /** Version as string. Each part of the version should be separated by a dot '.'. */ string;
}

/**
 * A module that should be shared in the share scope.
 */
export type SharedItem = NonEmptyString;

/**
 * Filters shared modules by version or request: with 'include' only matching modules are shared, with 'exclude' matching ones are not. A filtered-out module is resolved and bundled as if it wasn't shared.
 * @since 5.112.0
 */
export interface SharedModuleFilter {
	/**
	 * Request remainder after a key ending in a slash (e.g. 'get' for 'lodash/get' under 'lodash/'). Has no effect on other keys.
	 */
	request?: RegExp | NonEmptyString;
	/**
	 * Version range the module's version (from its description file or the 'version' option) is tested against. A consumed module is tested through its fallback module, so this has no effect on consumes without one.
	 */
	version?: NonEmptyString;
}

/**
 * Modules that should be shared in the share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 */
export type SharedObject = {
	/**
	 * Modules that should be shared in the share scope.
	 */
	[key: string]: SharedConfig | SharedItem;
};
