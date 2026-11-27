class C {
  #x;
  m() {
    ({ #x: x }.y = this);
    [{ #x: x }.y] = this;
    ({ a: { #x: x }.y } = this);
    [{ #x: x }.y = 1] = this;
    for ({ #x: x }.y of []);
  }
}
