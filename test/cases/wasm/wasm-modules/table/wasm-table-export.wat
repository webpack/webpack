(module
  (type $t0 (func (result i32)))
  (func $f1 (type $t0) (result i32)
    (i32.const 42))
  (func $f2 (type $t0) (result i32)
    (i32.const 13))
  (table $table (export "table") 2 anyfunc)
  (elem (i32.const 0) $f1 $f2))

