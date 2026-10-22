import { value } from "./file";

// "./ignored" is dropped by IgnorePlugin, so its accept dependency resolves to no
// module and generating the accept must not crash (#21300). This entry is compiled
// but never executed, so the missing-module runtime stub is never reached.
if (value) module.hot.accept(["./file", "./ignored"], function () {});
