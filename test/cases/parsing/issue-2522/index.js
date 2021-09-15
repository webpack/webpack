import { a, a as aa } from "./module";
import b from "./module";
import * as c from "./module";

it("should import into object shorthand", function() {
	var o = {
		a,
		aa,
		b,
		c
	};
	expect(o).toEqual({
		a: 123,
		aa: 123,
		b: 456,
		c: nsObj({
			a: 123,
			default: 456
		})
	});
})
