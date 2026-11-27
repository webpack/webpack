type T = number;
import { fooBar } from "baz";
import type { JSONSchema7 } from 'json-schema';

export { JSONSchema7 }
export { fooBar }

export { fooBar2 } from "baz";
export type { fooBar3 } from "baz";
export { type fooBar4 } from "baz";

export type { fooBar3 as a } from "baz";
export { type fooBar4 as b} from "baz";

let foo: JSONSchema7;

declare module 'test/submodule' {
  export { JSONSchema7 }
  export { fooBar }

  export { fooBar2 } from "baz";
  export type { fooBar3 } from "baz";
  export { type fooBar4 } from "baz";

  export type { fooBar3 as a } from "baz";
  export { type fooBar4 as b} from "baz";

  let foo: JSONSchema7;
}

declare module 'test/submodule2' {
  import { fooBar } from "baz";
  import type { JSONSchema7 } from 'json-schema';

  export { JSONSchema7 }
  export { fooBar }

  export { fooBar2 } from "baz";
  export type { fooBar3 } from "baz";
  export { type fooBar4 } from "baz";

  export type { fooBar3 as a } from "baz";
  export { type fooBar4 as b} from "baz";

  let foo: JSONSchema7;
}
