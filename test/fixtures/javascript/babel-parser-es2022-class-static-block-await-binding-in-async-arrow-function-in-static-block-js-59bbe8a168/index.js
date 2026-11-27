var C;
// await is not allowed in async arrow
C = class { static { async (await) => {} } };

C = class { static { async (x = await) => {} } };

C = class { static { async ({ [await]: x }) => {} } };
