import * as C from "./reexport-namespace";
import { counter } from "./reexport-namespace";
import * as C2 from "./reexport-namespace-again";

it("should allow to reexport namespaces 1", () => {
	(0, counter.reset)();
	expect(counter.counter).toBe(0);
	(0, counter.increment)();
	expect(counter.counter).toBe(1);
});

it("should allow to reexport namespaces 2", () => {
	(0, C.counter.reset)();
	expect(C.counter.counter).toBe(0);
	(0, C.counter.increment)();
	expect(C.counter.counter).toBe(1);
});

it("should allow to reexport namespaces 3", () => {
	(0, C2.CC.counter.reset)();
	expect(C2.CC.counter.counter).toBe(0);
	(0, C2.CC.counter.increment)();
	expect(C2.CC.counter.counter).toBe(1);
});

import CJS from "./cjs";

it("should be able to call a deep function in commonjs", () => {
	expect(CJS.a.b.c.d()).toBe(42);
});

it("should report consistent exports info", () => {
	const x1 = counter.exportsInfo;

	if (process.env.NODE_ENV === "production") {
		expect(x1.incrementInfo).toBe(true);
		expect(x1.counterInfo).toBe(true);
		expect(x1.resetInfo).toBe(true);
		expect(x1.unusedExport).toBe(false);
		expect(x1.unusedExportInfo).toBe(false);
		expect(x1.somethingElse).toBe(false);
		expect(x1.somethingElseInfo).toBe(false);
		expect(C.exportsInfo.nsInfo).toBe(true);
		expect(C.exportsInfo.ns2).toBe(false);
		expect(C.exportsInfo.ns2Info).toBe(false);
	} else if (process.env.NODE_ENV === "development") {
		expect(x1.incrementInfo).toBe(undefined);
		expect(x1.counterInfo).toBe(undefined);
		expect(x1.resetInfo).toBe(undefined);
		expect(x1.unusedExport).toBe(true);
		expect(x1.unusedExportInfo).toBe(undefined);
		expect(x1.somethingElse).toBe(true);
		expect(x1.somethingElseInfo).toBe(undefined);
		expect(C.exportsInfo.nsInfo).toBe(undefined);
		expect(C.exportsInfo.ns2).toBe(true);
		expect(C.exportsInfo.ns2Info).toBe(undefined);
	}
	expect(x1.increment).toBe(true);
	expect(x1.counter).toBe(true);
	expect(x1.reset).toBe(true);
	expect(x1.incrementProvideInfo).toBe(true);
	expect(x1.somethingElseProvideInfo).toBe(false);
	expect(C.exportsInfo.increment).toBe(x1.increment);
	expect(C.exportsInfo.counter).toBe(x1.counter);
	expect(C.exportsInfo.reset).toBe(x1.reset);
	expect(C.exportsInfo.unusedExport).toBe(x1.unusedExport);
	expect(C.exportsInfo.incrementInfo).toBe(x1.incrementInfo);
	expect(C.exportsInfo.counterInfo).toBe(x1.counterInfo);
	expect(C.exportsInfo.resetInfo).toBe(x1.resetInfo);
	expect(C.exportsInfo.unusedExportInfo).toBe(x1.unusedExportInfo);
	expect(C.exportsInfo.incrementProvideInfo).toBe(x1.incrementProvideInfo);
	expect(C.exportsInfo.somethingElseProvideInfo).toBe(
		x1.somethingElseProvideInfo
	);
	expect(C.exportsInfo.ns).toBe(true);
	expect(C2.exportsInfo).toBe(true);
	expect(__webpack_exports_info__).toBe(true);
});
