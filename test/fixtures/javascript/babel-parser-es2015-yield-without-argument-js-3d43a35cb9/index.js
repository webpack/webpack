function* f() {
  (yield);
  [yield];
  { yield };
  yield;
  true ? yield : 1;
  yield, 1;
}
