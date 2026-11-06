import { read } from "./consumer.js";
import keys from "./other.js";

it("should regenerate an unchanged consumer when nested re-exported names change", () => {
	expect(read()).toBe("beta");
	expect(keys).toEqual(
		WATCH_STEP === "1" ? ["alphaValue", "betaValue"] : []
	);
});
