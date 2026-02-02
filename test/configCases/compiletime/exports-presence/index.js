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
		false && d;
		d ? d() : throw_();
		// warning: 26:7(a), 27:3(a)
		if ((a && val1) || true) {
			a();
		}
		if (a && a.b && a.b.c) {
			a();
		}
		if (a.b.c) {
			a.b.c();
		}

		if (a && a.b.c) {
		}
	});

	it("some unsupported expressions", () => {
		// warning: 42:13(a)
		if ((() => a())()) {
		}
		// warning: 45:7(a)
		if (!a && b) {
		}
		// warning: 48:6(a)
		if (a & true) {
		}

		function* foo() {
			// warning: 53:13(a)
			if (yield a && true) {
			}
		}
		async function foo1() {
			// warning: 58:14(a)
			if ((await a) && true) {
			}
		}
		let var1;
		// We don't support `AssignmentExpression` here
		// warning: 64:14(b)
		if ((var1 = b)) {
		}
		// We don't support `AssignmentExpression` here
		// warning: 68:14(b)
		if ((var1 = b) && c && c.a) {
		}
		// warning: 71:21(a)
		if (justFunction`${a}`) {
		}
		// warning: 74:9(a)
		if (`${a}`) {
		}
	});

	it("ternary operator", () => {
		c && c.a ? c.a() : 0;
		const b1 = c ? c() : 0;
		c && c.a && d && d.a ? c.a(d.a) : 0;
		"a" in c ? c.a() : 0;
		"a" in c && "a" in b ? b.a(c.a) : 0;
		// warning: 85:6(d)
		c ? d() : (() => {})();
	});

	it("in operator", () => {
		if ("a" in m) {
			justFunction(m.a);
		}
		if ("b" in m && "c" in m.b) {
			justFunction(m.b.c);
		}
		if ("c" in m) {
			justFunction(m.c);
		}
		if ("a" in d.c) {
			justFunction(d.c.a());
		}
	});

	it("!= and !== operator", () => {
		// undefined != false
		// warning: 106:6(d)
		if (c != false) {
		}

		// undefined !== false
		// warning: 111:6(d)
		if (c !== false) {
		}

		// We don't support `??` here
		// warning: 116:6(c), 116:37(c)
		if (c != undefined ?? undefined != c) {
		}
	});

	it("!identifier", () => {
		if (!!c) {
			console.log(c);
		}

		// warning: 126:12(d), 127:15(d)
		if (0 || !d) {
			console.log(d);
		}

		// warning: 131:7(d), 131:13(c), 132:15(c), 132:18(d)
		if (!d && !c) {
			console.log(c, d);
		}

		// warning: 136:3(d), 136:7(d)
		!d ? d : 3;
	});
});

it("should do nothing", () => {
	expect(aaa).toBe(undefined);
	expect(bbb).toBe(undefined);
	expect(ccc).toBe(undefined);
	expect(ddd).toBe(undefined);
});
