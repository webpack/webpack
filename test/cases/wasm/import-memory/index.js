// test.wasm:
//
// (module
//   (import "./env" "mem" (memory $./env.mem 1))
//   (func (export "test") (result i32)
//     (i32.load8_s (i32.const 0))
//   )
// )
it("should use the implicit Memory object", function() {
    return import("./test.wasm");
});
