---
"webpack": patch
---

Fix CSS modules `composes` so `composes: foo from "./self.module.css"` from inside `self.module.css` no longer creates a duplicate module instance. Previously the import dependency forced a second `css/module` instance of the same file, emitting the file's CSS twice with two different `localIdent` hashes and producing duplicated entries in the JS class-name export. Self-targeting requests are now collapsed to a self-reference, matching css-loader's output.
