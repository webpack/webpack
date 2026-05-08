// Sync `var` external — defer should produce a `/* deferred harmony import */`
// runtime statement because `buildMeta.async` is not set.
import * as syncDeferNs from /* webpackDefer: true */ "ext-var-sync";

// Async `promise` external — defer should be ignored at runtime because the
// external is already async (`buildMeta.async === true`).
import * as asyncDeferNs from /* webpackDefer: true */ "ext-promise-async";

export { syncDeferNs, asyncDeferNs };
