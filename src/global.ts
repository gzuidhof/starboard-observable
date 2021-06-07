// @ts-ignore
import css from "./inspectorStyles.css";

export function injectInspectorStyles() {
  if (!document.querySelector("#observable-inspector-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "observable-inspector-styles";
    styleSheet.innerHTML = css;
    document.head.appendChild(styleSheet);
  }
}
