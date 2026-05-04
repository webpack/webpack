/*#__NO_SIDE_EFFECTS__*/
export function pureExport1(x) {
	return x;
}

/*#__NO_SIDE_EFFECTS__*/
export default function pureDefaultExport(x) {
	return x;
}

/*#__NO_SIDE_EFFECTS__*/
export const pureExport2 = (x) => {
	return x;
};

export var pureExport3 = /*#__NO_SIDE_EFFECTS__*/ (x) => {
	return x;
};

/*#__NO_SIDE_EFFECTS__*/
function fn4(x) {
	return x;
}

/*#__NO_SIDE_EFFECTS__*/
const pureExport5 = (x) => {
	return x;
};

export const impureExport = (x) => {
	return x;
};

export const usedExportsOfPureSource = __webpack_exports_info__.usedExports;

export { fn4 as pureExport4, pureExport5 };
