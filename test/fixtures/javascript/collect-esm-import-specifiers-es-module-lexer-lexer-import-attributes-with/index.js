
      import a from 'a' with { "quoted-key": "value" }
      import b from 'b' with { 'single-quoted': "value" }
      import c from 'c' with { "key-with-\"quote\"": "value-with-\"quote\"" }
      import d from 'd' with { "key\nwith\nnewlines": "value\twith\ttabs" }
      import e from 'e' with { "unicode\u0041": "test\u0042" }
      import f from 'f' with { type: "val\\backslash" }
    