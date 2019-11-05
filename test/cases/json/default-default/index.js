import { default as f } from "../data/f.json?default-imported";
import * as fStar from "../data/f.json?ns-imported";

it("should be possible to access a default key", () => {
	expect(f.default).toBe("default");
	expect(fStar.default.default).toBe("default");
});
