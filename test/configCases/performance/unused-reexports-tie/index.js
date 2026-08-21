import { used } from "./barrel";

it("should report equally sized re-exports in a stable order", () => {
	expect(used).toBe("used");
	// A counter of its own: sibling cases share the global object.
	expect(global.__tieLoaded).toBe(2);
});
