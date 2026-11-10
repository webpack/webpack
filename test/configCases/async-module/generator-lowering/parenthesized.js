const flag = typeof Promise === "function";
export const picked = await (flag ? Promise.resolve(4) : Promise.resolve(5));
export const scaled = await (Promise.resolve(3)) * 2;
export const broken = await
Promise.resolve(7);
