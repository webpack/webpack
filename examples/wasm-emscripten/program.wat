(module
  ;; Imported from the host ("glue"): webpack cannot provide this, which is
  ;; why the .wasm must be instantiated by the runtime, not by webpack.
  (import "env" "log" (func $log (param i32)))
  (func $fib (param $n i32) (result i32)
    (if (result i32) (i32.lt_s (get_local $n) (i32.const 2))
      (then (get_local $n))
      (else
        (i32.add
          (call $fib (i32.sub (get_local $n) (i32.const 1)))
          (call $fib (i32.sub (get_local $n) (i32.const 2)))))))
  (func (export "run") (param $n i32) (result i32)
    (local $r i32)
    (set_local $r (call $fib (get_local $n)))
    (call $log (get_local $r))
    (get_local $r)))
