import { a, b, c, d, e } from "./a";

import defaultImport from "./a";

it("should prefer local exports", function() {
	expect(a()).toEqual("a1");
	expect(e).toEqual("e1");
});

it("should prefer indirect exports over star exports", function() {
	expect(b).toEqual("b2");
	expect(d).toEqual("d2");
});

it("should use star exports", function() {
	expect(c).toEqual("c3");
});

it("should not export default via star export", function() {
	expect((typeof defaultImport)).toEqual("undefined");
});
