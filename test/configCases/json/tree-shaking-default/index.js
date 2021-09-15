import data, { nestedArray } from "./data";
import packageJson from "../../../../package.json";

it("should have to correct values", () => {
	expect(data.nested.key).toBe("value");
});

it("should be able to write properties", () => {
	// known key
	data.nested.key2 = "new value";
	expect(data.nested.key2).toBe("new value");
	// unknown key
	data.nested.key3 = "value3";
	expect(data.nested.key3).toBe("value3");
	// array methods and prototype properties
	data.nested.array.push(4);
	expect(data.nested.array.length).toEqual(4);
	// direct and nested access
	const a = data.nested.array2;
	data.nested.array2[1] = 42;
	expect(a[1]).toEqual(42);
	expect(a.length).toEqual(3);
	// only nested access
	expect(data.nested.array3[1]).toBe("ok");
	expect(data.nested.array4[10]).toBe("ok");
	expect(data.nested.array5[0]).toBe("ok");
	// nested access and length
	expect(data.nested.array6[1]).toBe("ok");
	expect(data.nested.array6.length).toBe(3);
	expect(data.nested.array7[10]).toBe("ok");
	expect(data.nested.array7.length).toBe(11);
	expect(data.nested.array8[0]).toBe("ok");
	expect(data.nested.array8.length).toBe(11);
	// object methods
	expect(data.nested.object.hasOwnProperty("test")).toBe(true);
	// unknown object property
	data.nested.object2.unknownProperty = 42;
	expect(data.nested.object2.unknownProperty).toBe(42);
	data.nested.object3.unknownProperty = { deep: "deep" };
	expect(data.nested.object3.unknownProperty.deep).toBe("deep");
	// number methods
	expect(data.nested.number.toFixed(1)).toBe("42.0");
	// nested in array
	expect(nestedArray[1][1].deep.deep).toBe("ok");
});

it("should not have unused keys in bundle", () => {
	const fs = require("fs");
	const content = fs.readFileSync(__filename, "utf-8");
	expect(content).toMatch(/\\?"TESTVALUE\\?"/);
	expect(content).not.toMatch(/\\?"UNUSEDKEY\\?"/);
	expect(content).not.toMatch(/\\?"UNUSEDVALUE\\?"/);
	expect(content).not.toMatch(/\\?"nested\\?"/);
	expect(content).toMatch(/\.unknownProperty\s*=/);
	expect(content).toMatch(/\.unknownProperty\.deep\)/);
	expect(content).not.toMatch(/\\?"dependencies\\?"/);
	expect(content).not.toMatch(/\\?"scripts\\?"/);
});

it("should tree-shake package.json too", () => {
	expect(packageJson.name).toBe("webpack");
	expect(packageJson.repository.url).toBe(
		"https://github.com/webpack/webpack.git"
	);
});
