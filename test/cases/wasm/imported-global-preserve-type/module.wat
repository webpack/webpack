(module
  (import "./env.js" "number" (global f64))

  (func (export "get") (result f64)
    (get_global 0)
  )
)
