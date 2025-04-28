export * from "./a";
export default "default-value";
export var b = "b";
export { default as external } from "external";
export * from "external-named";
export { default as MyClass1 } from './class-commonjs';
export { default as MyClass2 } from './class-esm';
export { default as func1 } from './function-commonjs';
export { default as func2 } from './function-esm';

var module = "should not conflict",
	define = "should not conflict",
	require = "should not conflict",
	exports = "should not conflict",
	globalName = "should not conflict";
console.log.bind(console, module, define, require, exports, globalName);
