import {bar} from "./bar";

export function foo() {
	return "ok";
}

function foo2() {
	return "ok";
}
export { foo2 }

export { default } from "./bar";
