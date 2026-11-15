import * as ns from "./module.js";

it("should keep a computed destructuring key with nested requires intact", () => {
	var name = "a";
	const { ["someLongExportName" || require(`./dir/${name}.js`)]: value } = ns;
	expect(value).toBe("value");
});
