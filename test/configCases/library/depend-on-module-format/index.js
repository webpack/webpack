import { leaf } from "./leaf.mjs";
import { middle } from "./middle.mjs";

it("should export a dependOn entry with the module chunk format", () => {
	expect(middle).toBe("middle+shared");
	expect(leaf).toBe("leaf+middle+shared");
});
