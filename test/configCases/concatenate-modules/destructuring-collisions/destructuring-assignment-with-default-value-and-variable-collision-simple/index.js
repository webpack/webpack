import modA from "./module-a";
import config from "./config";

const { variableClash = "defaultValue" } = config;

it("destructuring-assignment-with-default-value-and-variable-collision-simple: renames a destructured assignment with default value correctly", () => {
	expect(modA).toBe("valueFromSomeFile");
	expect(variableClash).toBe("Correct value");
});
