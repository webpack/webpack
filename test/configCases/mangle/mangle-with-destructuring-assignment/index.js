import path from "path";
import * as module from "./module";
import { obj3, obj3CanMangle, obj4, obj4CanMangle } from "./reexport?side-effects" // enable side effects to ensure reexport is not skipped
import data from "./data.json";
import data2 from "./data.json?2";

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

it("should mangle default in namespace import", async () => {
	const { default: foo, defaultCanMangle } = module;
	expect(foo).toBe("default");
	expect(defaultCanMangle).toBe(true);
});

it("should mangle when destructuring json", async () => {
	const { obj: {
		"arr": [
			{ prop1: p1 = 0 }
		]
	} } = data;
	expect(p1).toBe(1);

	const values = [];
	({
		foo: values[0],
		obj: {
			["a" + "r" + "r"]: {
				length: values[1],
			}
		}
	} = data);
	expect(values[0]).toBe("foo");
	expect(values[1]).toBe(3);

	const generatedJson = __non_webpack_require__(path.resolve(__dirname, "data.json.js"));
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

it("should mangle when destructuring json 2", async () => {
	const { prop1, prop2 } = data2.obj.arr[0];
	expect(prop1).toBe(1);
	expect(prop2).toBe(2);

	const generatedJson = __non_webpack_require__(path.resolve(__dirname, "data.json_2.js"));
	expect(generatedJson).toEqual({
		"W": {
			"Q": [
				{ "X": 1, "Q": 2 },
			],
		}
	});
});
