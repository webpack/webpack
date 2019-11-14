import * as c from "../data/c.json";
import * as d from "../data/d.json";
import { bb, aa } from "../data/e.json";
import f, { named } from "../data/f.json";
import g, { named as gnamed } from "../data/g.json";

it("should be possible to import json data", function() {
	expect(c[2]).toBe(3);
	expect(Object.keys(d)).toEqual(["default"]);
	expect(aa).toBe(1);
	expect(bb).toBe(2);
	expect(named).toBe("named");
	expect({ f }).toEqual({
		f: {
			__esModule: true,
			default: "default",
			named: "named"
		}
	});
	expect(g.named).toBe(gnamed);
});
