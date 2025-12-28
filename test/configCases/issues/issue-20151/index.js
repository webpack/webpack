import { __ as i18n } from "./i18n";

function unused() {
	return i18n("wtf");
}

const __ = "local";

it("should correctly handle unused function with same-named local variable", () => {
	expect(__).toBe("local");
});

// This ensures unused is not tree-shaken in some configurations
export { unused };
