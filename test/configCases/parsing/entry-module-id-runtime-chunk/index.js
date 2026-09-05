import { sharedIsMain, sharedSeesRequireMain } from "./shared";

it("should report import.meta.main for the entry module", () => {
	expect(import.meta.main).toBe(true);
	expect(sharedIsMain).toBe(false);
});

it("should resolve require.main through the split runtime chunk", () => {
	expect(require.main).toBeDefined();
	expect(sharedSeesRequireMain).toBe(true);
});
