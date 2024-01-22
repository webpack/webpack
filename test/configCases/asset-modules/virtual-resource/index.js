import jpg from "./1.jpg";

it("should create a data url", () => {
	expect(jpg).toMatch(/\.webp$/);
});
