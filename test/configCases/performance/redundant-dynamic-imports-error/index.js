import { shared } from "./shared";
import { other } from "./other";
import nested from "./nested";

it("should report both unsplit 'import()' calls as an error", () => {
	expect(shared + other).toBe(3);

	return Promise.all([import("./shared"), nested]);
});
