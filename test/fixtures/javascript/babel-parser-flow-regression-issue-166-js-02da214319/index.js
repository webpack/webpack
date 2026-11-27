function *foo() {
  const x = (yield 5: any);
  x ? yield 1 : x;
}
