/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type BannerPluginArgument =
	| string
	| BannerPluginOptions
	| BannerFunction;
/**
 * The banner as function, it will be wrapped in a comment.
 */
export type BannerFunction = (data: {
	hash: string;
	chunk: import("../../lib/Chunk");
	filename: string;
}) => string;
/**
 * Filtering rules.
 */
export type Rules = Rule[] | Rule;
/**
 * Filtering rule as regex or string.
 */
export type Rule = RegExp | string;

export interface BannerPluginOptions {
	/**
	 * Specifies the banner.
	 */
	banner: string | BannerFunction;
	/**
	 * If true, the banner will only be added to the entry chunks.
	 */
	entryOnly?: boolean;
	/**
	 * Exclude all modules matching any of these conditions.
	 */
	exclude?: Rules;
	/**
	 * Include all modules matching any of these conditions.
	 */
	include?: Rules;
	/**
	 * If true, banner will not be wrapped in a comment.
	 */
	raw?: boolean;
	/**
	 * Include all modules that pass test assertion.
	 */
	test?: Rules;
}
