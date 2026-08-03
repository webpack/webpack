import value from "./dep";

export { default } from "./dep";
export const keep = "keep";

it("should re-export a default export", () => {
	expect(value).toBe("dep-default");
});
