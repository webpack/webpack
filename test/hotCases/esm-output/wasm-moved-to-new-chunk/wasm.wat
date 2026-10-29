(module
  (type $t1 (func (result i32)))
  (func $getNumber (export "getNumber") (type $t1) (result i32)
    (i32.const 40)))
---
(module
  (type $t1 (func (result i32)))
  (func $getNumber (export "getNumber") (type $t1) (result i32)
    (i32.const 42)))
