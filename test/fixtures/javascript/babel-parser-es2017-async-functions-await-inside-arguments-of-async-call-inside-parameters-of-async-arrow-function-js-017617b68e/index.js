async function fn() {
  async (x = async(y = await 2)) => {};
}