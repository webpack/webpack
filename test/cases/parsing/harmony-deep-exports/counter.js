export let counter = 0;
export const increment = () => {
	counter++;
};
export function reset() {
	counter = 0;
}
export const unusedExport = 42;

export const exportsInfo = {
	increment: __webpack_exports_info__.increment.used,
	counter: __webpack_exports_info__.counter.used,
	reset: __webpack_exports_info__.reset.used,
	unusedExport: __webpack_exports_info__.unusedExport.used,
	somethingElse: __webpack_exports_info__.somethingElse.used,
	incrementInfo: __webpack_exports_info__.increment.useInfo,
	counterInfo: __webpack_exports_info__.counter.useInfo,
	resetInfo: __webpack_exports_info__.reset.useInfo,
	unusedExportInfo: __webpack_exports_info__.unusedExport.useInfo,
	somethingElseInfo: __webpack_exports_info__.somethingElse.useInfo,
	incrementProvideInfo: __webpack_exports_info__.increment.provideInfo,
	somethingElseProvideInfo: __webpack_exports_info__.somethingElse.provideInfo
};
