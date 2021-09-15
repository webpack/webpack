import createB from "./dependency";
import createC from "./dependency2";

export function a() {
	return "a";
}

export { createB as b };

export function c() {
	return createC();
}
