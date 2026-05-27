(module
  ;; WebAssemblyImportDependency: imports JS consts as globals
  (import "./env.js" "n" (global i32))
  (import "./env.js" "m" (global $g2 f64))
  ;; WebAssemblyExportImportedDependency: re-exports the imported globals
  (export "v" (global 0))
  (global $g i32 (get_global 0))
  (export "w" (global $g))
  (export "x" (global $g2))
  (func (export "test") (result i32)
    get_global 0
    get_global $g
    i32.add
  )
)
