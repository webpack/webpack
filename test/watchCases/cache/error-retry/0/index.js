import { value } from "./stable";

it("should recover once the missing module appears", () => {
	expect(value).toBe(42);
	if (WATCH_STEP === "1") {
		expect(require("./added").added).toBe("yes");
	}
});
