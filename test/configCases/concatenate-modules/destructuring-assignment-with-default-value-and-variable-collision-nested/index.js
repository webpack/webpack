import * as modA from "./module-a";
import config from "./config";

const {
	deeply: {
		nested: { thing = "defaultValue" }
	}
} = config;

it("renames a nested destructured assignment with default value correctly", () => {
	expect(modA.deeply).toBe("Ignore me please");
	expect(modA.nested).toBe("Ignore me please");
	expect(modA.thing).toBe("Ignore me please");

	expect(thing).toBe("Correct value");
});
