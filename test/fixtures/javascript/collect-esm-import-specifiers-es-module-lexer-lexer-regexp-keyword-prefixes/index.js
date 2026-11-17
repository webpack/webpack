
      x: while (true) {
        if (foo) break
        /import("a")/.test(bar) || baz()
        if (foo) continue
        /import("b")/.test(bar) || baz()
        if (foo) break x
        /import("c")/.test(bar) || baz()
        if (foo) continue x
        /import("d")/.test(bar) || baz()
      }
    