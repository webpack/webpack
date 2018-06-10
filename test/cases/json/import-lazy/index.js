
it("should be possible to import json data async", function() {
	return Promise.all([
		import("../data/a.json"),
		import("../data/b.json"),
		import("../data/c.json"),
		import("../data/d.json"),
		import("../data/e.json"),
		import("../data/f.json"),
		import("../data/g.json")
	]).then(([a, b, c, d, e, f, g]) => {
		expect(a).toEqual({
			default: null,
			[Symbol.toStringTag]: "Module"
		});
		expect(b).toEqual({
			default: 123,
			[Symbol.toStringTag]: "Module"
		});
		expect(c).toEqual({
			0: 1,
			1: 2,
			2: 3,
			3: 4,
			default: [1, 2, 3, 4],
			[Symbol.toStringTag]: "Module"
		});
		expect(d).toEqual({
			default: {},
			[Symbol.toStringTag]: "Module"
		});
		expect(e).toEqual({
			aa: 1,
			bb: 2,
			1: "x",
			default: {
				aa: 1,
				bb: 2,
				"1": "x"
			},
			[Symbol.toStringTag]: "Module"
		});
		expect(f).toEqual({
			named: "named",
			default: {
				named: "named",
				"default": "default",
				__esModule: true
			},
			[Symbol.toStringTag]: "Module"
		});
		expect(g).toEqual({
			named: {},
			default: {
				named: {}
			},
			[Symbol.toStringTag]: "Module"
		});
		expect(g.named).toBe(g.default.named);
	});
});
