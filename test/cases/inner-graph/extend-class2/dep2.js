export class A {}
export class B {}
export const getC = () => class C {};
export const getD = () => class D {};
export const getE = () => class E {};
export const getF = () => class F {};

export const exportsInfoForA = __webpack_exports_info__.A.used;
export const exportsInfoForB = __webpack_exports_info__.B.used;
export const exportsInfoForC = __webpack_exports_info__.getC.used;
export const exportsInfoForD = __webpack_exports_info__.getD.used;
export const exportsInfoForE = __webpack_exports_info__.getE.used;
export const exportsInfoForF = __webpack_exports_info__.getF.used;
