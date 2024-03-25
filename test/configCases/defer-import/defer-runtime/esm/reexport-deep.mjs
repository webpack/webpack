import { touch } from "../side-effect-counter.js";

export function f() {
	return "func";
}

export class T {
	constructor() {
		this.x = 1;
	}
}

touch();
