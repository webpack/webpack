(module
  (func $add (export "add") (param $p0 i32) (param $p1 i32) (result i32)
    (i32.add
      (get_local $p0)
      (get_local $p1)
    )
	)
)

