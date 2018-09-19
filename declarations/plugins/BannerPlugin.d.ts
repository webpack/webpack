/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type BannerPlugin =
	| {
			/**
			 * Specifies the banner
			 */
			banner:
				| {
						[k: string]: any;
				  }
				| string;
			/**
			 * If true, the banner will only be added to the entry chunks
			 */
			entryOnly?: boolean;
			/**
			 * Exclude all modules matching any of these conditions
			 */
			exclude?: Rules;
			/**
			 * Include all modules matching any of these conditions
			 */
			include?: Rules;
			/**
			 * If true, banner will not be wrapped in a comment
			 */
			raw?: boolean;
			/**
			 * Include all modules that pass test assertion
			 */
			test?: Rules;
	  }
	| {
			[k: string]: any;
	  }
	| string;
export type Rules = Rule[] | Rule;
export type Rule =
	| {
			[k: string]: any;
	  }
	| string;
