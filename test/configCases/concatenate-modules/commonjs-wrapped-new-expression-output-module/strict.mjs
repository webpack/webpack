// strict ESM: the default import binds to the wrapper accessor directly
import Thing from "./thing.cjs";

export function construct(options) {
	return new Thing(options);
}

export const ctor = Thing;
