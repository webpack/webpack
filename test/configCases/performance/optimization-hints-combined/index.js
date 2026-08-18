import { used } from "leaky";
import { known } from "./consumer";

it("should report all three optimization hints together", () => {
	expect(used).toBe(1);
	expect(known).toBe(2);
});
