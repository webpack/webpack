import { equal as eq, deepEqual } from "./assert";

function myFunction() {
	function it() {
		eq(1, arguments[0]);
	}
	deepEqual(1, 1);
	it();
}

function fun2() {
	deepEqual(1, 1);
}

export { myFunction as fun1, fun2 };
