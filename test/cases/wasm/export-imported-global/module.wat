(module
  (import "./env.js" "n" (global i32))
  (export "v" (global 0))
  (global $g i32 (get_global 0))
  (export "w" (global $g))
)
