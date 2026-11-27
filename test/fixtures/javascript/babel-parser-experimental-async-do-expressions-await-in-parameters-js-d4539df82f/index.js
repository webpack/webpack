function f(a = async do { await 1 }) {}
async function g(a = async do { await 1 }) {}
function* h(a = async do { await 1 }) {}
(a = async do { await 1 }) => {};
async (a = async do { await 1 }) => {};
({ m(a = async do { await 1 }) {} });
function i({ a = async do { await 1 } }, [b = async do { await 1 }]) {}
async ({ a = async do { await 1 } }) => {};
async function j(a = async do { b = do { await 1 } }) {}
