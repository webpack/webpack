import * as counter from "./counter";
export { counter };
import * as counter2 from "./counter";
export { counter2 };

export const exportsInfo = {
	increment: __webpack_exports_info__.counter.increment.used,
	counter: __webpack_exports_info__.counter.counter.used,
	reset: __webpack_exports_info__.counter.reset.used,
	unusedExport: __webpack_exports_info__.counter.unusedExport.used,
	somethingElse: __webpack_exports_info__.counter.somethingElse.used,
	incrementInfo: __webpack_exports_info__.counter.increment.useInfo,
	counterInfo: __webpack_exports_info__.counter.counter.useInfo,
	resetInfo: __webpack_exports_info__.counter.reset.useInfo,
	unusedExportInfo: __webpack_exports_info__.counter.unusedExport.useInfo,
	somethingElseInfo: __webpack_exports_info__.counter.somethingElse.useInfo,
	incrementProvideInfo: __webpack_exports_info__.counter.increment.provideInfo,
	somethingElseProvideInfo:
		__webpack_exports_info__.counter.somethingElse.provideInfo,
	ns: __webpack_exports_info__.counter.used,
	nsInfo: __webpack_exports_info__.counter.useInfo,
	ns2: __webpack_exports_info__.counter2.used,
	ns2Info: __webpack_exports_info__.counter2.useInfo
};
