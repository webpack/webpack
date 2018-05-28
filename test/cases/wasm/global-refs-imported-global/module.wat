(module
  (import "./env.js" "n" (global i32))
  (global (export "value") i32 (get_global 0))
)
