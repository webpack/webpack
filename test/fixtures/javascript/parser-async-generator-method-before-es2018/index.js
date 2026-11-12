// Before ES2018 a function or method is a generator or async, never both.
async function f() {}
class A { *o() {} async n() {} async *m() {} }
