const helper = "MODULE_SCOPE_HELPER";

export const eager = "EAGER_VALUE_123";
// `read` needs the module-scope `helper`; the arrow's parameter of the same
// name must not make the declaration look self-contained.
export const lazy = { read: helper, identity: (helper) => helper };
