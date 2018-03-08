// Before transformation:
//
// (module
//   (import "./b" "logFoo" (func $a))
//   (import "./a" "two" (global i32))
//   (func (export "getTwo") (result i32)
//     (get_global 0)
//   )
//   (func (export "logFoo")
//     (call $a)
//   )
// )
//
// ----
//
// After transformation:
//

import("./test.wasm").then(({getTwo, logFoo}) => {
  console.log("getTwo", getTwo());
  console.log(logFoo());
})
