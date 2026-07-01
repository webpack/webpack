import { b } from "./pkg";

it("should provide a star re-export name newly imported with unsafe cache", () => {
	expect(b).toBe("b");
});
