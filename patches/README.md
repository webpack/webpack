# patches/

Standalone patches kept here for **upstream** contribution. They are **not** applied
automatically (no `patch-package`, no `postinstall` hook) — apply them by hand
when working on the target repo.

## `tooling-infer-in-tuple-extends.patch`

Fixes a bug in [`webpack/tooling`](https://github.com/webpack/tooling)'s
`generate-types` (the `types.d.ts` generator). In a conditional-type `extends`
clause, `infer` placed in a **tuple element/rest** slot was dropped (e.g.
`[infer H, ...]` → `[H, ...]`) and a variadic rest (`...infer R`) was rendered
as `...(R)[]`, producing invalid TypeScript. The patch renders tuples in
`extends` position element-wise so `infer` survives and `Rest` vs `Variadic`
is distinguished.

Tracking issue: https://github.com/webpack/webpack/issues/21191

Apply against a `webpack/tooling` checkout:

```sh
cd path/to/tooling
patch -p1 < path/to/webpack/patches/tooling-infer-in-tuple-extends.patch
```

## `serializer-positional-tuple-typing.patch`

Positional serializer typing: `ObjectSerializerContext<[A, B, C]>` /
`ObjectDeserializerContext<[A, B, C]>` make the first `write`/`read` expect `A`,
the second `B`, etc. `write` advances by returning the next context; `read`
advances via a `rest` accessor (same object, retyped to `Tail<T>` — no
allocation). Includes the built-in serializers and `ConstDependency` as a
worked dependency example.

Held as a patch because the generated `types.d.ts` only validates once the
`tooling` fix above is released. Apply against this repo, then regenerate:

```sh
git apply patches/serializer-positional-tuple-typing.patch
yarn fix:special
```
