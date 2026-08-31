// strict ESM: the default import of a CommonJS module resolves straight to the
// wrapper accessor call, skipping the `__webpack_require__.n` interop
import Thing from "./thing.cjs";
import * as namespace from "./thing.cjs";
import identity from "./identity.cjs";
import { Reexported } from "./reexport.mjs";

export function construct(options) {
	return new Thing(options);
}

export function constructThroughNamespace(options) {
	return new namespace.default(options);
}

export function constructThroughReexport(options) {
	return new Reexported(options);
}

export function call(value) {
	return identity(value);
}

export function tag(value) {
	return identity`tag${value}`;
}

// the reference opens a statement that ASI could glue to the previous one, so
// it must be emitted with a leading semicolon
export function readInAsiPosition() {
	const seen = []
	seen.push(1)
	Thing
	return seen
}

export function read() {
	return Thing;
}

export const kind = typeof Thing;
