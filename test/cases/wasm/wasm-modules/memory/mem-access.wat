(module
  (type $t0 (func (result i32)))
  (type $t1 (func (param i32)))
  (import "./memory.wat" "memory" (memory $./memory.wasm.memory 1))
  (func $get (export "get") (type $t0) (result i32)
    (i32.load
      (i32.const 0)))
  (func $set (export "set") (type $t1) (param $p i32)
    (i32.store
      (i32.const 0)
      (get_local $p))))
