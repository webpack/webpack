(module
  (type $t0 (func (result i32)))
  (type $t1 (func (result i32)))
  (type $t2 (func (param i32) (result i32)))
  (func $f0 (type $t0) (result i32)
    (i32.const 42))
  (func $f1 (type $t0) (result i32)
    (i32.const 13))
  (func $callByIndex (export "callByIndex") (type $t2) (param $p0 i32) (result i32)
    (call_indirect (type $t1)
      (get_local $p0)))
  (table $T0 2 anyfunc)
  (elem (i32.const 0) $f0 $f1))

