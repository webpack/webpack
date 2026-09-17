"use strict";

// Published plugins require these by their pre-move path. `yarn find-deep-imports`
// is what found them; each entry keeps that path resolving to the moved file.
const SHIMS = [
	["ModuleFilenameHelpers", "devtool/ModuleFilenameHelpers"],
	["InitFragment", "template/InitFragment"],
	["DependencyTemplate", "template/DependencyTemplate"],
	["WebpackError", "errors/WebpackError"],
	["ModuleNotFoundError", "errors/ModuleNotFoundError"],
	["SingleEntryPlugin", "entry/EntryPlugin"]
];

describe("deep path shims", () => {
	for (const [legacy, moved] of SHIMS) {
		it(`should keep "webpack/lib/${legacy}" resolving to ${moved}`, () => {
			expect(require(`../../lib/${legacy}`)).toBe(
				require(`../../lib/${moved}`)
			);
		});
	}
});
