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
	o.should.be.eql({
		a: 123,
		aa: 123,
		b: 456,
		c: {
			a: 123,
			default: 456
		}
	});
})