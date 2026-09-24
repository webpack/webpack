/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type AbsolutePath, type HttpUrl } from "../../vocabulary";

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
	cacheLocation?: false | AbsolutePath;
	/**
	 * When set, anything that would lead to a modification of the lockfile or any resource content, will result in an error.
	 */
	frozen?: boolean;
	/**
	 * Location of the lockfile.
	 */
	lockfileLocation?: AbsolutePath;
	/**
	 * Proxy configuration, which can be used to specify a proxy server to use for HTTP requests.
	 */
	proxy?: string;
	/**
	 * When set, resources of existing lockfile entries will be fetched and entries will be upgraded when resource content has changed.
	 */
	upgrade?: boolean;
}

/**
 * List of allowed URIs (resp. the beginning of them).
 */
export type HttpUriOptionsAllowedUris = Array<
	| /** List of allowed URIs (resp. the beginning of them). */ /** Allowed URI pattern. */ RegExp
	| /** Allowed URI (resp. the beginning of it). */ HttpUrl
	| /** Allowed URI filter function. */ import("../../../lib/schemes/HttpUriPlugin").AllowedUriFn
>;

/**
 * @schema
 */
export type HttpUriPluginOptions = HttpUriOptions;
