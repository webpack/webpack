import { a } from "./pkg/barrel";
import { a as direct } from "./pkg/target";

it("should import through the barrel", () => {
	expect(a).toBe("barrel");
	expect(direct).toBe("target");
});
