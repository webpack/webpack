import { b as a, cc } from "./named-barrel";
import { b as c, d } from "./mixed-barrel";
import { b } from "./star-barrel";
import * as nested from "./nested-barrel";
import { inner } from "./ns-barrel";
// two consumers of one barrel: `one` requests `a` (builds the barrel),
// `two` requests `b` after the barrel is already built (lazyItems path)
import { one } from "./shared-barrel/one";
import { two } from "./shared-barrel/two";

it("should provide the requested re-exports across barrel shapes", () => {
	expect(a).toBe("a");
	expect(cc).toBe("c");
	expect(b).toBe("b");
	expect(c).toBe("c");
	expect(d).toBe("d");
	expect(nested.a).toBe("b");
	expect(inner.p).toBe("p");
	expect(inner.q).toBe("q");
});

it("should build a re-export target requested after the barrel was built", () => {
	expect(one).toBe("abc");
	expect(two).toBe("b");
});
