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

	const info = JSON.parse(await fs.promises.readFile(path.resolve(__dirname, "json-exports-info.json"), 'utf-8'));
	const exportsInfo = info["main"]["./data.json"];
	expect(exportsInfo.foo.usedName !== "foo").toBe(true);
	expect(exportsInfo.obj.usedName !== "obj").toBe(true);
	expect(exportsInfo.obj.arr.usedName !== "arr").toBe(true);
	expect(exportsInfo.obj.arr.length.usedName !== "length").toBe(false); // keep the name of array length
	expect(exportsInfo.obj.arr[0].usedName !== "0").toBe(false); // keep the name of array index
	expect(exportsInfo.obj.arr[0].prop1.usedName !== "prop1").toBe(true);
	expect(exportsInfo.obj.arr[0].prop2.usedName !== "prop2").toBe(true);
	expect(exportsInfo.obj.arr[0].prop3.usedName !== "prop3").toBe(false); // prop3 is not provided
	expect(exportsInfo.obj.arr[1].prop3.usedName !== "prop3").toBe(true);
	expect(exportsInfo.obj.arr[1].prop4.used === 0).toBe(true); // prop4 is unused
	expect(exportsInfo.obj.arr[2].used === 4).toBe(true); // arr[2] is used (fallback to no destructuring since failed to evaluate `prop5`)
});
