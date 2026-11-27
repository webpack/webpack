async function f() { (x = y = await 1) => {}; }
async (x = y = await) => {};
async ({ x = y = await }) => {};
