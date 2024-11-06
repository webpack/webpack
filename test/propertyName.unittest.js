const { propertyName } = require("../lib/util/propertyName");

describe("propertyName", () => {
	it("quotes special cases", () => {
		expect(propertyName("class")).toBe('"class"');
		expect(propertyName("white space")).toBe('"white space"');
		expect(propertyName("3cc")).toBe('"3cc"');
	});

	it("passes non-special cases through", () => {
		expect(propertyName("a")).toBe("a");
		expect(propertyName("_xyz")).toBe("_xyz");
		expect(propertyName("cc3")).toBe("cc3");
	});
});
