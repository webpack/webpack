(module
  (type $t0 (func (result i32)))
  (import "./proto-module" "__proto__" (func $imported (type $t0)))
  (import "./proto-module" "__proto__" (func $importedAgain (type $t0)))
  (func $own (export "__proto__") (type $t0) (i32.const 7))
  (func $run (export "run") (type $t0) (i32.add (call $imported) (call $importedAgain))))
