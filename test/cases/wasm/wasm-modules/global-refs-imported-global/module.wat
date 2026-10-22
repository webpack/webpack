(module
  (import "./env.js" "n" (global i32))
  (global i32 (get_global 0))

  (func (export "get") (result i32)
    (get_global 1)
  )
)

