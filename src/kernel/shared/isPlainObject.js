export function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ArrayBuffer.isView(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
