// packages\babel-traverse\test\fixtures\regression\duplicate-variable-in-different-module-ts\input.ts

type T = number;
declare module 'test' {
  import type { JSONSchema7 } from 'json-schema';
  import { bar } from "baz";
  export { fooBar } from "baz";
  let foo: JSONSchema7;
  // can reference type outsider module
  let baz: T;
}

declare module 'test/submodule' {
  import type { JSONSchema7 } from 'json-schema';
  import { bar } from "baz";
  export { fooBar } from "baz";
  let foo: JSONSchema7;
}
