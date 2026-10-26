import "./unused";
import { colors, missing } from "./ui";

it("should build the target of an unused import through a nested barrel (#22929)", () => {
	expect(colors).toBe("colors");
	expect(missing).toBe(undefined);
});
