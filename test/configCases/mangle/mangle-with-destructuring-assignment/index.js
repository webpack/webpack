import * as module from "./module";
import { obj3, obj3CanMangle, obj4, obj4CanMangle } from "./reexport?side-effects" // enable side effects to ensure reexport is not skipped
import data from "./data.json";
import fs from "fs";
import path from "path";

it("should mangle export when destructuring module", () => {
	const { obj: { a, b }, objCanMangle } = module
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(objCanMangle).toBe(true)
});

it("should mangle export when destructuring module's property", () => {
	const { a, b } = module.obj2
	const { obj2CanMangle } = module
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(obj2CanMangle).toBe(true)
});

it("should mangle export when using module dot property", () => {
	expect(module.aaa).toBe("aaa");
	expect(module.aaaCanMangle).toBe(true)
});

it("should mangle export when destructuring module's property is a module", () => {
	const { aaa, bbb } = obj3;
	expect(aaa).toBe("a");
	expect(bbb).toBe("b");
	expect(obj3CanMangle).toBe(true)
});

it("should not mangle export when destructuring module's nested property is a module (used in unknown way)", () => {
	const { nested: { obj5, obj5CanMangle } } = obj4;
	expect(obj5.aaa).toBe("a");
	expect(obj5.bbb).toBe("b");
	expect(obj4CanMangle).toBe(true);
	expect(obj5CanMangle).toBe(false); // obj5 is used in unknown way
});

it("should mangle when destructuring json", async () => {
	const { obj: {
		["a" + "r" + "r"]: [
			{
				prop1: p1 = 0,
				[`prop${2}`]: p2,
				prop3 = 3
			}
		]
	} } = data;
	expect(p1).toBe(1);
	expect(p2).toBe(2);
	expect(prop3).toBe(3);
	const prop5 = "prop5";
	const values = [];
	({
		foo: values[0],
		obj: {
			["a" + "r" + "r"]: {
				1: { prop3: values[1] },
				2: { [prop5]: values[2] },
				length: values[3],
			}
		}
	} = data);
	expect(values[0]).toBe("foo");
	expect(values[1]).toBe(3);
	expect(values[2]).toBe(5);
	expect(values[3]).toBe(3);

	const generatedJson = __non_webpack_require__(path.resolve(__dirname, "data.json.js"));
	expect(generatedJson.foo).toBeUndefined();
	expect(generatedJson.obj).toBeUndefined();
	expect(generatedJson).toEqual({
		"W": {
			"arr": [
				{ "prop1": 1, "prop2": 2 },
				{ "prop3": 3, "prop4": 4 },
				{ "prop5": 5, "prop6": 6 }
			]
		},
		"p": "foo"
	});
});
