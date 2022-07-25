import { "\0 add" as add } from './reexport';

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
}
