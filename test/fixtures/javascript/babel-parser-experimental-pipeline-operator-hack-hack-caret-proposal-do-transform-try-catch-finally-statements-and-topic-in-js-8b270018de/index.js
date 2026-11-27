value |> do {
  try { JSON.parse(whatever); }
  catch (error) { console.error(error); }
  finally { something(^); }
}
