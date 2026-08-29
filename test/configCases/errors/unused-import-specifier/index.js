import { marker as missingMarker } from "./unused-missing.js";
import { marker as presentMarker } from "./unused-present.js";

it("should still build and run the module with the unused specifier", () => {
	expect(missingMarker).toBe("unused-missing");
});

it("should not report an unused specifier that does exist", () => {
	expect(presentMarker).toBe("unused-present");
});
