import { value } from "./dependency";

if (module.hot) {
	module.hot.accept("./dependency", () => {});
}

it("should re-read the import when the accepted dependency updates", () => {
	expect(value).toBe(42);
	const source = require("fs").readFileSync(__filename, "utf8");
	// split, so the bundle holds the wrapper only where webpack writes it
	expect(source).toContain(["__WEBPACK_OUTDATED", "DEPENDENCIES__ =>"].join("_"));
});
