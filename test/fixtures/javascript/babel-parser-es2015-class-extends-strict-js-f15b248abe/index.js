class C extends (function B() {
  with ({});
  return B;
}()) {}
