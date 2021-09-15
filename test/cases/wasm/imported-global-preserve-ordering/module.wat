(module
  (import "./env.js" "a" (global i32))
  (import "./env.js" "b" (global i32))

  (global $c i32 (i32.const 3))
  (global $d i32 (i32.const 4))

  (export "c" (global $c))
  (export "d" (global $d))
)
