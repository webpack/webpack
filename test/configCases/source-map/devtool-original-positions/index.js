import { answer } from "./module";

it("should run the module", () => {
	expect(answer).toBe(42);
	expect(global.webpackSourceMapMarker).toBe("ORIGINAL_POSITION_MARKER");
});
