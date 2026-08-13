import fromSpecifier from "./specifier";
import fromExpression from "./expression";

it("should mangle a property read through a namespace re-exported as default", () => {
	expect(fromSpecifier.member.value).toBe(42);
	expect(fromExpression.member.value).toBe(42);
});
