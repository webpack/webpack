import * as wasm from "./wasm_lib_bg.wasm";
export * from "./wasm_lib_bg.js";
import { __wbg_set_wasm } from "./wasm_lib_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
