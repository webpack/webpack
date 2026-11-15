it("should keep an own `__proto__` key of a JSON module in the namespace", () =>
	import("./data.json").then((ns) => {
		expect(Object.prototype.hasOwnProperty.call(ns, "__proto__")).toBe(true);
		expect(ns.__proto__).toEqual({ x: 1 });
		expect(ns.a).toBe(2);
	}));

it("should keep an own `__proto__` key of a CommonJS module in the namespace", () =>
	import("./cjs.js").then((ns) => {
		expect(Object.prototype.hasOwnProperty.call(ns, "__proto__")).toBe(true);
		expect(ns.__proto__).toBe(5);
		expect(ns.b).toBe(3);
		expect(ns.default.b).toBe(3);
	}));
