import { used } from "./dep";

export const list = [];

// ASI ends each declaration and field below before the `[` on the next line
export const unusedValue = used ? 1 : () => {}
[1, 2].forEach(v => list.push(v))

export class UnusedClass {
	static value = used ? 1 : () => {}
	["method"]() {
		return used;
	}
}
