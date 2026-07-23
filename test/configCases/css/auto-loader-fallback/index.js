import * as asCss from "./as-css.css!=!./css-loader.js!./content.js";
import * as plain from "./plain.css";

it("should fall back to javascript for an inline loader request", () => {
	// The loader turns the CSS into a JS module; the built-in css type would
	// instead export an object, so this value proves the fallback applied.
	expect(require("./js-loader.js!./inline.css")).toBe(
		"LOADED_BY_CUSTOM_LOADER"
	);
});

it("should fall back to javascript for a hook-injected loader", () => {
	expect(require("./injected.css")).toBe("LOADED_BY_CUSTOM_LOADER");
});

it("should keep the built-in css type for loader-free .css files", () => {
	expect(plain).toEqual({});
});

it("should keep the built-in css type for an explicit `!=!` matchResource", () => {
	// `!=!` re-types the loader result as `.css` on purpose — no fallback.
	expect(asCss).toEqual({});
});
