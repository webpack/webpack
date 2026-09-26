/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The whole of what a JSON schema states and a TypeScript type cannot: each
// alias is one combination of validation-only keywords, named. A source
// writes the alias where it would write the underlying type, and nothing
// here changes what that type means.

/**
 * A path that is neither empty nor absolute.
 * @minLength 1
 * @absolutePath false
 */
export type NonEmptyRelativePath = string;

/**
 * A JavaScript identifier, or several joined by dots.
 * @minLength 1
 * @pattern ^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$
 */
export type DottedIdentifier = string;

/**
 * An absolute path.
 * @absolutePath true
 */
export type AbsolutePath = string;

/**
 * A path that is not absolute.
 * @absolutePath false
 */
export type RelativePath = string;

/**
 * A URL with the http or https scheme.
 * @pattern ^https?://
 */
export type HttpUrl = string;

/**
 * A string that is not empty.
 * @minLength 1
 */
export type NonEmptyString = string;

/**
 * A source map kind, spelled the way `devtool` takes it.
 * @pattern ^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map(-debugids)?$
 */
export type DevToolSpelling = string;

/**
 * A number that is not negative.
 * @minimum 0
 */
export type NonNegativeNumber = number;

/**
 * A number of at least one.
 * @minimum 1
 */
export type PositiveNumber = number;
