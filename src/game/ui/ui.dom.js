export function el(tag, className = "", text = "") {
  const node = document.createElement(String(tag || "div"));
  if (className) node.className = String(className);
  if (text !== undefined && text !== null && String(text).length > 0) {
    node.textContent = String(text);
  }
  return node;
}
