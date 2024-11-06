import { "\0 add" as add, "string name" as variable } from './reexport';

export default class Foo {
	static {
		new Foo(add);
	}

	constructor(fn) {
		this.#foo = fn;
		this.#add();
	}

	#foo = undefined;

	#add() {
		if (#foo in this && this.#foo) {
			this.#foo();
		}
	}

	static getVar() {
		return variable;
	}
}
