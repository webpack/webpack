(module
  (type $t0 (func (result i32)))
  (type $t1 (func (param i32) (result i32)))
  (import "./wasm-table-export.wat" "table" (table $./wasm-table-export.wasm.table 2 anyfunc))
  (func $callByIndex (export "callByIndex") (type $t1) (param $i i32) (result i32)
    (call_indirect (type $t0)
      (get_local $i))))

