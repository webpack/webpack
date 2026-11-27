var yieldSet, C, iter;
function* g() {
  class C_ {
    get [yield]() { return 'get yield'; }
    set [yield](param) { yieldSet = param; }
  }

  C = C_;
}
