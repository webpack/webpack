(module
  (type $t0 (func (result i32)))
  (type $t1 (func (param i32) (result i32)))
  (import "./wasm2.wat" "getNumber" (func $./wasm2.wasm.getNumber (type $t0)))
  (func $addNumber (export "addNumber") (type $t1) (param $p0 i32) (result i32)
    (i32.add
      (get_local $p0)
      (call $./wasm2.wasm.getNumber))))

