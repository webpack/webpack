import x from "./dep1";
import y from "./dep2";

export function f() {
	return x;
}

export function g() {
	return y;
}

module.hot.accept(["./dep1", "./dep2"]);
