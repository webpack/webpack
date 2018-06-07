(module
  (type $t0 (func (param i64) (result i64)))
  (func $getI64 (type $t0) (param $p0 i64) (result i64)
    get_local $p0
    i64.const 22
    i64.add)
  (export "getI64" (func $getI64)))
