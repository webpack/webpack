async function f(a = do { await 1 }) {}
async function g(a = do { b = async do { 1 }; await 1 }) {}
