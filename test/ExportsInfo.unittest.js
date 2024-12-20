"use strict";

const ExportsInfo = require("../lib/ExportsInfo");

describe("ExportsInfo", () => {
	const info = new ExportsInfo();
	const redirectInfo = new ExportsInfo();

	info.getOwnExportInfo("info");
	redirectInfo.getOwnExportInfo("redirect info");

	info.setRedirectNamedTo(redirectInfo);
	info.setHasUseInfo();
	info.setHasProvideInfo();

	it("Should return redirect's used exports", () => {
		expect(info.getUsedExports()).toBe(false);
	});

	it("Should return redirect's provided exports", () => {
		expect(info.getProvidedExports()).toEqual([]);
	});
});
