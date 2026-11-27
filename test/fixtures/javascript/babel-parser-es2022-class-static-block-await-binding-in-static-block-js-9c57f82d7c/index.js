var C;
// This file enumerates all the disallowed cases, for allowed cases, see await-binding-*
C = class { static { await } };

C = class { static { (await) } };

C = class { static { async (await) } };

C = class { static { async ({ [await]: x}) } };

async (x = class { static { await } }) => {};
// await as label is not allowed
C = class { static { await: 0 } };

C = class { static { class D { [await] } } };
// await binding in function declaration is not allowed
C = class { static { function await() {} } };
// await binding in class declaration is not allowed
C = class { static { class await {} } };
// await binding in class expression is not allowed
C = class { static { (class await {}) } };
// await in arrow parameters is not allowed
C = class { static { (await) => {} } };

C = class { static { (x = await) => {} } };

C = class { static { ({ [await]: x }) => {} } };

C = class { static { { await } } };
