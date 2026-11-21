import * as reexports from "./reexports.mjs";

it("should keep a default-only namespace re-export reached through a namespace", () => {
	expect(JSON.parse(JSON.stringify(reexports))).toEqual({
		data: { default: { a: 1 } },
		value: 2
	});
	expect(typeof undefined).toBe("undefined");
});
