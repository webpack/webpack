(module
  (import "./wasm2.wat" "memory" (memory 1))
  (type $t1 (func (param i32) (result i32)))
  (func $addNumber (export "addNumber") (type $t1) (param $p0 i32) (result i32)
    (i32.add
      (get_local $p0)
      (i32.const 22))))
