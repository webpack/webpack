// javascript/auto: the default import goes through the interop helper instead
import Thing from "./thing.cjs";

export function construct(options) {
	return new Thing(options);
}
