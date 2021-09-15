import { bar } from "./bar";

export function foo() {
	return "ok";
}

function foo2() {
	return "ok";
}
export { foo2 };

export default function () {
	return "ok";
}

export { default as results } from "./bar";
