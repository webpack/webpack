import a from "../data/a.json";
import b from "../data/b.json";
import c from "../data/c.json";
import d from "../data/d.json";
import e from "../data/e.json";
import f from "../data/f.json";

it("should be possible to import json data", function() {
	expect({a}).toEqual({a: null});
	expect(b).toBe(123);
	expect(c).toEqual([1, 2, 3, 4]);
	expect(d).toEqual({});
	expect(e).toEqual({
		aa: 1,
		bb: 2,
		"1": "x"
	});
	expect(f).toEqual({
		named: "named",
		"default": "default",
		__esModule: true
	});
});
