const flag = true;
export const picked = await (flag ? Promise.resolve(4) : Promise.resolve(5));
export const scaled = await (Promise.resolve(3)) * 2;
