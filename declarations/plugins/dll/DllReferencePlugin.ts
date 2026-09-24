/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type AbsolutePath, type NonEmptyString } from "../../vocabulary";

/**
 * The mappings from request to module info.
 * @minProperties 1
 */
export type DllReferencePluginOptionsContent = {
	/**
	 * Module info.
	 */
	[key: string]: {
		/**
		 * Meta information about the module.
		 */
		buildMeta?: { [key: string]: any };
		/**
		 * Information about the provided exports of the module.
		 */
		exports?:
			| /** List of provided exports of the module. */ Array</** Name of the export. */ NonEmptyString>
			| /** Exports unknown/dynamic. */ true;
		/**
		 * Module ID.
		 */
		id: number | NonEmptyString;
	};
};

/**
 * An object containing content, name and type.
 */
export interface DllReferencePluginOptionsManifest {
	/**
	 * The mappings from request to module info.
	 * @minProperties 1
	 */
	content: DllReferencePluginOptionsContent;
	/**
	 * The name where the dll is exposed (external name).
	 */
	name?: NonEmptyString;
	/**
	 * The type how the dll is exposed (external type).
	 */
	type?: DllReferencePluginOptionsSourceType;
}

/**
 * The type how the dll is exposed (external type).
 */
export type DllReferencePluginOptionsSourceType =
	| "var"
	| "assign"
	| "this"
	| "window"
	| "global"
	| "commonjs"
	| "commonjs2"
	| "commonjs-module"
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system";

/**
 * @schema
 */
export type DllReferencePluginOptions =
	| {
			/**
			 * Context of requests in the manifest (or content property) as absolute path.
			 */
			context?: AbsolutePath;
			/**
			 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
			 */
			extensions?: Array</** An extension. */ string>;
			/**
			 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
			 */
			manifest: AbsolutePath | DllReferencePluginOptionsManifest;
			/**
			 * The name where the dll is exposed (external name, defaults to manifest.name).
			 */
			name?: NonEmptyString;
			/**
			 * Prefix which is used for accessing the content of the dll.
			 */
			scope?: NonEmptyString;
			/**
			 * How the dll is exposed (libraryTarget, defaults to manifest.type).
			 */
			sourceType?: DllReferencePluginOptionsSourceType;
			/**
			 * The way how the export of the dll bundle is used.
			 */
			type?: "require" | "object";
	  }
	| {
			/**
			 * The mappings from request to module info.
			 * @minProperties 1
			 */
			content: DllReferencePluginOptionsContent;
			/**
			 * Context of requests in the manifest (or content property) as absolute path.
			 */
			context?: AbsolutePath;
			/**
			 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
			 */
			extensions?: Array</** An extension. */ string>;
			/**
			 * The name where the dll is exposed (external name).
			 */
			name: NonEmptyString;
			/**
			 * Prefix which is used for accessing the content of the dll.
			 */
			scope?: NonEmptyString;
			/**
			 * How the dll is exposed (libraryTarget).
			 */
			sourceType?: DllReferencePluginOptionsSourceType;
			/**
			 * The way how the export of the dll bundle is used.
			 */
			type?: "require" | "object";
	  };
