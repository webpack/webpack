// The write is unread, so the template tags the object it sets, which opens
// `export default` bare as a literal does.
let t;
export default (t = {})`x`;
