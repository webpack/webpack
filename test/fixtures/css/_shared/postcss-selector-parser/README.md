# postcss-selector-parser selector inputs

These fixtures contain the distinct selector inputs exercised by
[postcss-selector-parser](https://github.com/postcss/postcss-selector-parser)
at commit `44deaeb329a74aedb1e21709028bd2566a6b24fc`. Each input is followed by
`{color:red}` to make a stylesheet, including invalid and nonstandard inputs.
`cases.json` maps each fixture to the upstream tests that used its selector.
The upstream MIT license is in `LICENSE`.

The upstream suite also tests its own tree manipulation, options and timing.
The CSS invariants hold the selector inputs, not those API assertions.
The two repeated Sass interpolation fixtures use two repetitions by default,
instead of 60,000; the scaling invariant also checks them at 64 and 128.
