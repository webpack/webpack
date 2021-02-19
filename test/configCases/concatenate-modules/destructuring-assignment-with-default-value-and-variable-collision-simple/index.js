import modA from "./module-a";
import config from "./config";

const { variableClash = "defaultValue" } = config;

it("renames a destructured assignment with default value correctly", () => {
	expect(modA).toBe("valueFromSomeFile");
	expect(variableClash).toBe("Correct value");
});
