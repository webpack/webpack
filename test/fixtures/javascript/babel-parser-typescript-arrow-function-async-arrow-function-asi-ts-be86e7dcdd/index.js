var a = {}
// Should be parsed as an async arrow and an assignment expression
async<T,>() => {}

(a as any).b = 1;
