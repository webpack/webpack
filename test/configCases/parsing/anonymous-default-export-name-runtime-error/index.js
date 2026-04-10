import value from "./module";

it("should support anonymous default export expressions without a local binding", async () => {
	expect(typeof value).toBe("function");
	expect(await value()).toBe("ok");
	expect(value.name).toBe("default");
});
