// register.wasm
//
// (module
//   (import "./env" "tbl" (table 1 anyfunc))
//   (func $a (result i32)
//     (i32.const 11)
//   )
//
//   (elem (i32.const 0) $a)
// )
//
it("should use the implicit Table object", function() {
	return import("./register.wasm");
});

