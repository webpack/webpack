import { missing, value } from "./lib";

it("should walk a barrel carrying a foreign dependency that spells isLazy as a flag", () => {
	expect(value).toBe(1);
	expect(missing).toBe(undefined);
});
