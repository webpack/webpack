// Parenthesized, an optional member is still called with its object as `this`,
// so only past `0,` does the template call what the reduced call returned.
export function a(o) { var t; return (t = (() => o?.f)())`x`; }
export function b(f) { var t; return (t = (() => f?.())())`x`; }
