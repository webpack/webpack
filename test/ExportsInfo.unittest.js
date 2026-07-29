"use strict";

const ExportsInfo = require("../lib/ExportsInfo");

const { ExportInfo } = ExportsInfo;

describe("ExportInfo", () => {
	describe("_resetProvideInfo", () => {
		it("clears the pure-provide bit so a rebuilt impure export is not left marked pure", () => {
			const info = new ExportInfo("foo");
			info.pureProvide = true;
			expect(info.pureProvide).toBe(true);

			info._resetProvideInfo();

			// FlagDependencyExports only ever sets pureProvide true, so without the
			// reset an export that turned impure would incorrectly stay pure
			expect(info.pureProvide).toBeUndefined();
		});

		it("resets provide-side fields to the undetermined state", () => {
			const info = new ExportInfo("foo");
			info.provided = true;
			info.terminalBinding = true;
			info.canMangleProvide = false;

			info._resetProvideInfo();

			expect(info.provided).toBeUndefined();
			expect(info.terminalBinding).toBe(false);
			expect(info.canMangleProvide).toBeUndefined();
		});
	});

	describe("_resetUseInfo", () => {
		it("preserves the pure-provide bit (provide info is untouched)", () => {
			const info = new ExportInfo("foo");
			info.pureProvide = true;

			info._resetUseInfo();

			expect(info.pureProvide).toBe(true);
		});

		it("resets use-side fields but keeps provide info", () => {
			const info = new ExportInfo("foo");
			info.provided = true;
			info.canMangleUse = false;

			info._resetUseInfo();

			expect(info.canMangleUse).toBeUndefined();
			expect(info.provided).toBe(true);
		});

		it("recurses into an owned nested exportsInfo", () => {
			const info = new ExportInfo("foo");
			const nested = info.createNestedExportsInfo();
			const nestedExport = nested.getExportInfo("bar");
			nestedExport.canMangleUse = false;

			info._resetUseInfo();

			expect(nested.getExportInfo("bar").canMangleUse).toBeUndefined();
		});
	});
});

describe("ExportsInfo", () => {
	it("_resetProvidedExports clears the pure-provide bit on every export", () => {
		const exportsInfo = new ExportsInfo();
		const info = exportsInfo.getExportInfo("foo");
		info.pureProvide = true;
		exportsInfo.otherExportsInfo.pureProvide = true;

		exportsInfo._resetProvidedExports();

		expect(exportsInfo.getExportInfo("foo").pureProvide).toBeUndefined();
		expect(exportsInfo.otherExportsInfo.pureProvide).toBeUndefined();
	});

	it("_resetUsedExports resets use info on every export but keeps provide info", () => {
		const exportsInfo = new ExportsInfo();
		const info = exportsInfo.getExportInfo("foo");
		info.provided = true;
		info.canMangleUse = false;

		exportsInfo._resetUsedExports();

		expect(exportsInfo.getExportInfo("foo").canMangleUse).toBeUndefined();
		expect(exportsInfo.getExportInfo("foo").provided).toBe(true);
	});

	it("_resetUsedExports follows the redirect target", () => {
		const exportsInfo = new ExportsInfo();
		const redirectTarget = new ExportsInfo();
		exportsInfo.setRedirectNamedTo(redirectTarget);
		const info = redirectTarget.getExportInfo("foo");
		info.canMangleUse = false;

		exportsInfo._resetUsedExports();

		expect(redirectTarget.getExportInfo("foo").canMangleUse).toBeUndefined();
	});
});
