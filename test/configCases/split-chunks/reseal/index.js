import value from "./shared";

it("should load split chunks after sealing again", async () => {
	expect(value).toBe(42);
	expect((await import("./lazy")).default).toBe(43);
});
