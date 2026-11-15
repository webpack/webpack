const types = ["commonjs", "commonjs-static", "this", "commonjs-default"];
const load = (index) => __non_webpack_require__(`./bundle${index}.js`);

for (const [index, type] of types.entries()) {
	it(`should copy an export named __proto__ as an own property (${type})`, () => {
		const lib = load(index);
		expect(Object.prototype.hasOwnProperty.call(lib, "__proto__")).toBe(true);
		expect(lib.__proto__).toEqual({ flag: true });
		expect(lib.other).toBe(1);
	});
}

it("should keep the prototype of every library target", () => {
	for (const index of types.keys()) {
		const lib = load(index);
		expect(Object.getPrototypeOf(lib)).not.toBe(lib.__proto__);
		expect(lib.flag).toBe(undefined);
	}
});
