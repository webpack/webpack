/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type IgnorePlugin =
	| {
			/**
			 * A RegExp to test the request against
			 */
			resourceRegExp?: {
				[k: string]: any;
			};
			/**
			 * A RegExp to test the context (directory) against
			 */
			contextRegExp?: {
				[k: string]: any;
			};
	  }
	| {
			/**
			 * A filter function for resource
			 */
			checkResource?: {
				[k: string]: any;
			};
			/**
			 * A filter function for context
			 */
			checkContext?: {
				[k: string]: any;
			};
	  };
