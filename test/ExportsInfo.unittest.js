"use strict";

const ExportsInfo = require("../lib/ExportsInfo");

const { ExportInfo, UsageState } = ExportsInfo;

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

		it("keeps an owned nested exportsInfo and resets it in place", () => {
			const info = new ExportInfo("foo");
			const nested = info.createNestedExportsInfo();
			const nestedExport = nested.getExportInfo("bar");
			nestedExport.provided = true;
			nestedExport.canMangleUse = false;

			info._resetProvideInfo();

			const kept =
				/** @type {import("../lib/ExportsInfo")} */
				(info.getNestedExportsInfo());
			expect(kept).toBe(nested);
			// provide side reset in place, use side untouched
			expect(kept.getExportInfo("bar").provided).toBeUndefined();
			expect(kept.getExportInfo("bar").canMangleUse).toBe(false);
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

		it("clears the target map, the max-target memo and canInlineProvide", () => {
			const info = new ExportInfo("foo");
			info.setTarget(
				/** @type {any} */ ({}),
				/** @type {any} */ ({}),
				["a"],
				1
			);
			// prime the memo so a stale entry would be observable
			info._getMaxTarget();
			info.canInlineProvide = /** @type {any} */ (true);

			info._resetProvideInfo();

			expect(info._target).toBeUndefined();
			expect(info._maxTarget).toBeUndefined();
			expect(info.canInlineProvide).toBeUndefined();
		});

		it("resets two levels of owned nested exports info in place", () => {
			const info = new ExportInfo("foo");
			const nested = info.createNestedExportsInfo();
			const deep = nested.getExportInfo("bar").createNestedExportsInfo();
			deep.getExportInfo("baz").provided = true;

			info._resetProvideInfo();

			expect(nested.getExportInfo("bar").getNestedExportsInfo()).toBe(deep);
			expect(deep.getExportInfo("baz").provided).toBeUndefined();
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

		it("resets global and per-runtime usage state and the used name", () => {
			const info = new ExportInfo("foo");
			info.setHasUseInfo();
			info.setUsed(UsageState.Used, undefined);
			info.setUsed(UsageState.Used, "main");
			info.setUsedName("a");

			info._resetUseInfo();

			// no use info at all until the plugin re-initializes
			expect(info.getUsed("main")).toBe(UsageState.NoInfo);
			// after re-init the cleared state reads as unused in every runtime
			info.setHasUseInfo();
			expect(info.getUsed(undefined)).toBe(UsageState.Unused);
			expect(info.getUsed("main")).toBe(UsageState.Unused);
			// and a fresh use resolves to the export's own name, not the stale "a"
			info.setUsed(UsageState.Used, "main");
			expect(info.getUsedName(undefined, "main")).toBe("foo");
		});

		it("recurses through two levels of owned nested exports info", () => {
			const info = new ExportInfo("foo");
			const nested = info.createNestedExportsInfo();
			const deep = nested.getExportInfo("bar").createNestedExportsInfo();
			deep.getExportInfo("baz").canMangleUse = false;

			info._resetUseInfo();

			expect(deep.getExportInfo("baz").canMangleUse).toBeUndefined();
		});
	});

	describe("setHasProvideInfo", () => {
		it("recurses into an owned nested exportsInfo so a provide reset can be re-merged", () => {
			const info = new ExportInfo("foo");
			const nested = info.createNestedExportsInfo();
			nested.getExportInfo("bar").provided = true;

			info._resetProvideInfo();
			info.setHasProvideInfo();

			// FlagDependencyExports only upgrades provided from false/null, never
			// from undefined, so the re-init must reach nested exports too
			expect(nested.getExportInfo("bar").provided).toBe(false);
			expect(nested.getExportInfo("bar").canMangleProvide).toBe(true);
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

	it("_resetUsedExports drops the inlined-exports fast-path flag", () => {
		const exportsInfo = new ExportsInfo();
		exportsInfo.markInlinedExports();

		exportsInfo._resetUsedExports();

		expect(exportsInfo._hasInlinedExports).toBe(false);
	});

	it("_resetUsedExports does not wipe a redirect target owned by another module", () => {
		const exportsInfo = new ExportsInfo();
		const redirectTarget = new ExportsInfo();
		exportsInfo.setRedirectNamedTo(redirectTarget);
		const info = redirectTarget.getExportInfo("foo");
		info.canMangleUse = false;

		exportsInfo._resetUsedExports();

		// the target belongs to target.module; wiping it would lose usage that
		// module's own reset/re-trace is responsible for
		expect(redirectTarget.getExportInfo("foo").canMangleUse).toBe(false);
	});
});
