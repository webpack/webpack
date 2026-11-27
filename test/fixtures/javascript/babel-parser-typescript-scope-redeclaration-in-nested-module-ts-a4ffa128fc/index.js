declare module 'test/sub1' {
  import type { JSONSchema7 } from 'json-schema';
  module 'test/sub2' {
    export { JSONSchema7 }
  }
}
