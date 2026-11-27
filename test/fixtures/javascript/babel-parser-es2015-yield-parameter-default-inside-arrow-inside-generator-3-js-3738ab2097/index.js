function* fn() {
  (x = yield fn) => {};
}