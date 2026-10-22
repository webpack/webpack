(module
  (type $t0 (func (param i64) (result i64)))
  (type $t1 (func (result i32)))
  (import "./other1.wat" "getI64" (func $getI641 (type $t0)))
  (import "./other2.wat" "getI64" (func $getI642 (type $t0)))
  (func $testI64 (type $t1) (result i32)
    i64.const 1152921504606846976
    call $getI641
    call $getI642
    i64.const 1152921504606846976
    i64.sub
    i32.wrap/i64)
  (export "testI64" (func $testI64)))
