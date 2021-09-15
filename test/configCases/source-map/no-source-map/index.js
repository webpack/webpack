import ok from "./loader!";

it("should handle chunks", () => import("./chunk"));
it("should handle loaders", () => {
	expect(ok).toBe("ok");
});
