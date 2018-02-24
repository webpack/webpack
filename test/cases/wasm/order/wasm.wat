(module
  (func $trackWasm (import "./tracker" "trackWasm") (param i32))
  (global $magicNumber (import "./c.js" "magicNumber") i32)
  (func $start
    get_global $magicNumber
    call $trackWasm
  )
  (start $start)
)
