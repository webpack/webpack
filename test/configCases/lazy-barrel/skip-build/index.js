import { used } from "heavy-lib";

it("should build only the requested re-export target of a side-effect-free barrel", () => {
	expect(used).toBe("used");
});
