(module
  (type $t0 (func (param i32)))
  (type $t1 (func (result i32)))
  (func $_Z3seti (export "_Z3seti") (type $t0) (param $p0 i32)
    (i32.store offset=12
      (i32.const 0)
      (get_local $p0)))
  (func $_Z3getv (export "_Z3getv") (type $t1) (result i32)
    (i32.load offset=12
      (i32.const 0)))
  (table $T0 0 anyfunc)
  (memory $memory (export "memory") 1)
  (data (i32.const 12) "\00\00\00\00"))

