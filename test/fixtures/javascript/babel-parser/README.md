# Babel parser fixtures

These inputs come from `babel/babel` `@babel/parser` v8.1.2, commit
`49a2c7041dc79cf79d1e4cbc19a6e112838dc12d`, under
`packages/babel-parser/test/fixtures`. Each upstream `input.*` is stored as
`index.js` in a `babel-parser-*` fixture. The Babel parser options and expected
trees are not copied; webpack's JavaScript invariants read each source with
webpack's own parser and printer, including JSX, Flow, and TypeScript inputs.

The Babel MIT license is in this directory. The Esprima-derived fixtures retain
their separate license in `esprima-LICENSE`.
