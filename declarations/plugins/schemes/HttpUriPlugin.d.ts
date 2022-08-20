/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type HttpUriPluginOptions = HttpUriOptions;
/**
 * List of allowed URIs (resp. the beginning of them).
 */
export type HttpUriOptionsAllowedUris = (
	| RegExp
	| string
	| ((uri: string) => boolean)
)[];

/**
 * Options for building http resources.
 */
export interface HttpUriOptions {
	/**
	 * List of allowed URIs (resp. the beginning of them).
	 */
	allowedUris: HttpUriOptionsAllowedUris;
	/**
	 * Location where resource content is stored for lockfile entries. It's also possible to disable storing by passing false.
	 */
	cacheLocation?: false | string;
	/**
	 * When set, anything that would lead to a modification of the lockfile or any resource content, will result in an error.
	 */
	frozen?: boolean;
	/**
	 * Location of the lockfile.
	 */
	lockfileLocation?: string;
	/**
	 * Proxy configuration, which can be used to specify a proxy server to use for HTTP requests.
	 */
	proxy?: string;
	/**
	 * When set, resources of existing lockfile entries will be fetched and entries will be upgraded when resource content has changed.
	 */
	upgrade?: boolean;
}
