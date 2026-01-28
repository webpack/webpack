(module
  (type $t0 (func (param i32 i32) (result i32)))
  (type $t1 (func (result i32)))
  (func $add (export "add") (type $t0) (param $p0 i32) (param $p1 i32) (result i32)
    (i32.add
      (get_local $p0)
      (get_local $p1)))
  (func $getNumber (export "getNumber") (type $t1) (result i32)
    (i32.const 40)))

