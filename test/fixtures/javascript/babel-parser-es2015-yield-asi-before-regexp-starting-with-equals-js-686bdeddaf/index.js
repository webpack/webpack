function* g() {
  a ? b : yield () => {}
  /=/;
  a ? b : yield
  /=/;
}
