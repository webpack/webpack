import { fromB } from "./a";

it("should re-attach a pruned subtree when the import comes back", () => {
	expect(fromB).toBe("b");
});
