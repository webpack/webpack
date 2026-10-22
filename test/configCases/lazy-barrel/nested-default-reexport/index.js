import { Button, getButtonUtilityClass } from "./lib/index.mjs";

it("should build the default re-exported through a nested barrel", () => {
	expect(typeof Button).toBe("function");
	expect(Button()).toBe("Button");
});

it("should build a star re-export from the same nested barrel", () => {
	expect(getButtonUtilityClass("root")).toBe("MuiButton-root");
});
