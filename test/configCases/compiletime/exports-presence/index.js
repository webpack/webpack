import { NotHere as aaa, /* not here */ a } from "./aaa/index.js";
import { NotHere as bbb, /* not here */ b } from "./bbb/index.js";
import { NotHere as ccc, /* not here */ c } from "./ccc/index.js";
import { NotHere as ddd, /* not here */ d } from "./ddd/index.js";
import * as m from "./module";

const val1 = Math.random();

function throw_() {
	throw new Error();
}
function justFunction() {}

describe("should not add additional warnings/errors", () => {
	it("simple cases", () => {
		if (b) {
			if (d) d();
			b();
			if (c) {
				b();
			}
		}
		(false && d);
		(d ? d() : throw_());
		// should add 2 warnings
		if (a && val1 || true) {
			a();
		}
		if (a && a.b && a.b.c) {
			a();
		}
		// only one warning
		if (a.b.c) {
			a.b.c();
		}
	});

	it("different expressions", () => {
		if (a && a.b.c) {}
		// should add warning (function scope)
		if ((() => a())()) {}
		// should add warning (unary expression)
		if (!a && b) {}
		// should add warning (binary expression)
		if (a & true) {}

		function *foo() {
			// should add warning (yield expression)
			if (yield a && true) {}
		}
		async function foo1() {
			// should add warning (yield expression)
			if (await a && true) {}
		}
		let var1;
		if (var1 = b) {}
		if ((var1 = b) && c && c.a) {}
		// should add warning
		if (justFunction`${a}`) {}
		if (`${a}`) {}
	});

	it("ternary operator", () => {
		(c && c.a ? c.a() : 0);
		const b1 = c ? c() : 0;
		(c && c.a && d && d.a ? c.a(d.a) : 0);
		("a" in c ? c.a() : 0);
		("a" in c && "a" in b ? b.a(c.a) : 0);
		(c ? d() : (() => {})());
	});

	it("in operator", () => {
		if ("a" in m) { justFunction(m.a); }
		if ("b" in m && "c" in m.b) { justFunction(m.b.c); }
		if ("c" in m) { justFunction(m.c); }
		// should add one warning
		if ("a"in d.c) { justFunction(d.c.a()); }
	});

	it("identifier != falsy", () => {
		if (c != false) {}
		// should add warning since value could be undefined !== false
		if (c !== false) {}
		if (c != null && c.a != undefined && c.a.b != false && 0 != c.a.b.c && "" != c.a.b.c.d) {
			c();
			c.a();
			c().a;
			{
				c.a.b();
				const a = () => c.a.b.c.d();
				const b = function () {
					c.a.b.c.d();
				}
			}
		}
		// should add 2 warnings
		if (c != undefined ?? undefined != c) {}
	});
});

it("should do nothing", () => {
	expect(aaa).toBe(undefined);
	expect(bbb).toBe(undefined);
	expect(ccc).toBe(undefined);
	expect(ddd).toBe(undefined);
});
