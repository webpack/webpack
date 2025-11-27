declare function isRegex(o: any): boolean;
declare function isFunction(functionToCheck: any): any;
declare function isPlainObject(a: any): boolean;
declare function isUndefined(a: any): boolean;
/**
 * According to Webpack docs, a "test" should be the following:
 *
 * - A string
 * - A RegExp
 * - A function
 * - An array of conditions (may be nested)
 * - An object of conditions (may be nested)
 *
 * https://webpack.js.org/configuration/module/#condition
 */
declare function isSameCondition(a: any, b: any): boolean;
export { isRegex, isFunction, isPlainObject, isUndefined, isSameCondition };
