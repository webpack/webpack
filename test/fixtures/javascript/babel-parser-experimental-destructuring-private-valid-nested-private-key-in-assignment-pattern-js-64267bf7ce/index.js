class C {
  #x;
  m() {
    [{ #x: x }] = this;
    ({ a: { #x: x } } = this);
    ({ a: [{ #x: x }] } = this);
    [{ #x: x } = this] = [];
    for ([{ #x: x }] of []);
    ([{ #x: x }]) => {};
    async ([{ #x: x }]) => {};
  }
}
