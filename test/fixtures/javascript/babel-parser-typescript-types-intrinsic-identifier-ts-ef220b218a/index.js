type intrinsic = 2;
function foo(x: intrinsic): intrinsic {
  var a: intrinsic = 2;
  type X = 1 | intrinsic;
  type Foo = intrinsic.bar;
}
