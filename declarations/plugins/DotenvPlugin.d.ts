/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

export interface DotenvPluginOptions {
	/**
	 * Whether to allow empty strings in safe mode. If false, will throw an error if any env variables are empty (but only if safe mode is enabled).
	 */
	allowEmptyValues?: boolean;
	/**
	 * Adds support for dotenv-defaults. If set to true, uses ./.env.defaults. If a string, uses that location for a defaults file.
	 */
	defaults?: boolean | string;
	/**
	 * Allows your variables to be "expanded" for reusability within your .env file.
	 */
	expand?: boolean;
	/**
	 * The path to your environment variables. This same path applies to the .env.example and .env.defaults files.
	 */
	path?: string;
	/**
	 * The prefix to use before the name of your env variables.
	 */
	prefix?: string;
	/**
	 * If true, load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
	 */
	safe?: boolean | string;
	/**
	 * Set to true if you would rather load all system variables as well (useful for CI purposes).
	 */
	systemvars?: boolean;
}
