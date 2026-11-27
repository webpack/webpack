async function af () {
  value |> do { for await (const e of sequence) ^^; }
}
