class Foo {
  async* #readLines(path) {
    let file = await fileOpen(path);

    try {
      while (!file.EOF) {
        yield await file.readLine();
      }
    } finally {
      await file.close();
    }
  }
}
