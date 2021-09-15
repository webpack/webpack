import { a, b, c, d, e } from "./a";

import defaultImport from "./a";

it("should prefer local exports", function() {
	expect(a()).toBe("a1");
	expect(e).toBe("e1");
});

it("should prefer indirect exports over star exports", function() {
	expect(b).toBe("b2");
	expect(d).toBe("d2");
});

it("should use star exports", function() {
	expect(c).toBe("c3");
});

it("should not export default via star export", function() {
	expect((typeof defaultImport)).toBe("undefined");
});
