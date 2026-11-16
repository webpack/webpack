import * as style from "./style.module.css";

it("should read a value containing the word from as a value, not an import", () => {
	expect(style.quote).toBe('"a from b"');
	expect(style.font).toBe("format(x from y)");
	expect(typeof style.text).toBe("string");
});
