export * from "./a";
export default "default-value";
export var b = "b";
export { default as external } from "external";
export * from "external-named";

var module = "should not conflict",
	define = "should not conflict",
	require = "should not conflict",
	exports = "should not conflict",
	globalName = "should not conflict";
console.log.bind(console, module, define, require, exports, globalName);
