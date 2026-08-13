import "side-effect-free-ext";
import "function-form-ext";
import "twin-free-ext";
import "twin-ext";
import "default-ext";
import "with-side-effects-ext";
import { unusedExport } from "unused-export-ext";
import { used } from "used-ext";
import { reexportedUsed } from "./reexport";

const requiredUsed = require("required-used-ext");
const requiredUnused = require("required-unused-ext");
require("required-free-ext");

it("should not require a side-effect-free external imported for side effects only", () => {
	expect(REQUIRED).not.toContain("side-effect-free-ext");
	expect(REQUIRED).not.toContain("function-form-ext");
	expect(REQUIRED).not.toContain("required-free-ext");
});

it("should not require a side-effect-free external without used exports", () => {
	expect(REQUIRED).not.toContain("unused-export-ext");
	expect(REQUIRED).not.toContain("required-unused-ext");
	expect(REQUIRED).not.toContain("reexport-unused-ext");
});

it("should require a side-effect-free external when an export is used", () => {
	expect(used).toBe("used");
	expect(requiredUsed.used).toBe("used");
	expect(reexportedUsed).toBe("used");
	expect(REQUIRED).toContain("used-ext");
	expect(REQUIRED).toContain("required-used-ext");
	expect(REQUIRED).toContain("reexport-used-ext");
});

it("should require externals which may have side effects", () => {
	expect(REQUIRED).toContain("default-ext");
	expect(REQUIRED).toContain("with-side-effects-ext");
});

it("should keep externals with the same target but a different side effects state apart", () => {
	expect(REQUIRED).toContain("twin");
});
