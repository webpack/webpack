
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
		expect(a).toEqual(nsObj({
			default: null
		}));
		expect(b).toEqual(nsObj({
			default: 123
		}));
		expect(c).toEqual(nsObj({
			0: 1,
			1: 2,
			2: 3,
			3: 4,
			length: 4,
			default: [1, 2, 3, 4]
		}));
		expect(d).toEqual(nsObj({
			default: {}
		}));
		expect(e).toEqual(nsObj({
			aa: 1,
			bb: 2,
			1: "x",
			default: {
				aa: 1,
				bb: 2,
				"1": "x"
			}
		}));
		expect(f).toEqual(nsObj({
			named: "named",
			default: {
				named: "named",
				"default": "default",
				__esModule: true
			}
		}));
		expect(g).toEqual(nsObj({
			named: {},
			default: {
				named: {}
			}
		}));
		expect(g.named).toBe(g.default.named);
	});
});
