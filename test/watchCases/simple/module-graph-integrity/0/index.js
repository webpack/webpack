import value from "./value";

it("should preserve a valid graph across rebuilds", async () => {
	expect(value).toBe(Number(WATCH_STEP) + 1);
	expect((await import("./lazy")).default).toBe(value);
});
