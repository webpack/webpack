const localDefault = "local-default";

export { localDefault as default };
export const keep = "keep";

it("should export a local binding as default", () => {
	expect(localDefault).toBe("local-default");
});
