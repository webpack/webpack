export * as obj3 from "./module2"
export const obj3CanMangle = __webpack_exports_info__.obj3.canMangle;

import * as reexport2 from "./reexport2?side-effects"
export const obj4 = { nested: reexport2 }
export const obj4CanMangle = __webpack_exports_info__.reexport2.canMangle;
