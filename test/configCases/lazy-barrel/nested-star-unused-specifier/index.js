import "./unused";
import { colors, missing } from "./ui";
import { tone } from "./kit";
import { local } from "./lib";

it("should build the target of an unused import through a nested barrel (#22929)", () => {
	expect(colors).toBe("colors");
	expect(missing).toBe(undefined);
	expect(tone).toBe("tone");
	expect(local).toBe("local");
});
