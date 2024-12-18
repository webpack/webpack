(module
  (import "js" "mem" (memory 3 4 shared))
  (data (i32.const 0) "Hi")
  (export "bar" (memory 0))
)