const value = 1;

// `then` is never exposed on a namespace; `__esModule` is a real export here,
// not webpack's interop flag.
export { value as then, value as __esModule, value as real };
