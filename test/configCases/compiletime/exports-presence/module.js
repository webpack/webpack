import * as ns from "./stub";

function fn() {}

describe("should not add additional warnings/errors", () => {
	it("if statement", () => {
		if ("a" in ns) {
			fn(ns.a);
			ns.a();
		}
		if ("b" in ns && "c" in ns) {
			fn(ns.b, ns.c);
			ns.b();
			ns.c();
		}
		if (0 || "a" in ns) {
			fn(ns.a);

			if ("b" in ns && "c" in ns) {
				fn(ns.a, ns.b, ns.c);
			}

			if (null ?? "d" in ns) {
				fn(ns.a, ns.d);
			}
		}

		// warning: 31:6-10(a)
		if (!("a" in ns)) {
			//↑_____ negation is not a guard
			fn(ns.a);
		}

		if (!!("a" in ns)) {
			fn(ns.a);
		}
	});

	it("ternary operator", () => {
		"a" in ns ? fn(ns.a) : 0;
		"b" in ns && "c" in ns ? (fn(ns.b, ns.c), ns.b(), ns.c()) : 0;

		0 || "a" in ns
			? fn(ns.a)
			: "b" in ns && "c" in ns
				? "d" in ns
					? fn(ns.b, ns.c, ns.d)
					: (null ?? "e" in ns)
						? fn(ns.b, ns.c, ns.e)
						: fn(ns.b, ns.c)
				: 0;

		!!("a" in ns) ? ns.a() : 0;
	});

	it("unsupport experssions", () => {
		// warning: 58:6-10(a)
		if (ns.a) {
			// ↑_____ `ns.a` is direct usage, not a guard
			// warning: 61:15-19(a)
			console.log(ns.a);
		}
		// warning: 64:6-10(a)
		if (ns.a !== undefined) {
			// ↑_____ `ns.a` is direct usage, not a guard
			// warning: 67:15-19(a)
			console.log(ns.a);
		}
	});
});
