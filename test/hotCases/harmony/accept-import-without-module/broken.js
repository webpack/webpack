import { value } from "./file";

// "./ignored" is dropped by IgnorePlugin, so its accept dependency resolves to
// no module. Generating this accept must not crash (issue #21300). This entry
// is compiled but never executed by the runner, so the missing-module runtime
// stub is never reached.
if (value) module.hot.accept(["./file", "./ignored"], function () {});
