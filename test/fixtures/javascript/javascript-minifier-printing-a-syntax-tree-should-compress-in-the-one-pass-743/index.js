console.log(typeof class {}, typeof class { a() {} static b() {} c = f(); }, typeof class extends A {});
console.log(typeof class { static x = f(); }, typeof class { [f()]() {} }, typeof class { static { f(); } });
