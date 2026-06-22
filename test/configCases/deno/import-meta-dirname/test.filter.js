"use strict";

// `import.meta.dirname` is only emitted natively for deno >= 1.40, and only Deno
// provides it at runtime, so this case runs under the Deno runtime only.
module.exports = () => typeof Deno !== "undefined";
