import {a as b, callme, getCount} from "./a";
import * as c from "./b";

function donotcallme() {
	expect("asi unsafe call happened").toBe(false);
}

it("should respect asi flag", () => {
	(donotcallme)
	import.meta;
	(donotcallme)
	b();
	(donotcallme)
	c;

	let i = 0;
	for (;i < 1;i++) callme()
	for (;i < 2;i++) {
		(donotcallme)
		b();
	}
	if (i++) callme()
	if (false) {} else callme()
	while (i++ < 4) callme()

	expect(getCount()).toBe(4)
});
