import {a as b} from "./a";
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
});
