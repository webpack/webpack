import { a, b, c, d, E, F } from "dep";

export const joined = a + "x";
export const flags = b | c;
export const Derived = class extends E {
	constructor() {
		super();
		this.value = d;
	}
};
export class Named extends F {
	constructor() {
		super();
	}
}
