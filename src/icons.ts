const html = window.runtime.exports.libraries.LitHtml.html;

export function PinOffIcon({ width = 24, height = 24, hidden = false, title = "Pin Off" } = {}) {
  return html`<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    width="${width}"
    height="${height}"
    viewBox="0 0 18 18"
    aria-hidden="${hidden ? "true" : "false"}"
    aria-label="${title}"
  >
    <rect opacity="0" width="18" height="18" />
    <polygon points="5.823 10.999 7.012 12.189 1.962 17.203 0 18 0.822 16.013 5.823 10.999" />
    <path
      d="M11.9775,13.1605,12,10.1445,16.1465,6l1.135-.0115a.7262.7262,0,0,0,.505-1.2395L15.5205,2.48,13.25.2415A.723.723,0,0,0,12.0155.747L12,1.854,7.8535,6,4.841,6.022a.72345.72345,0,0,0-.554,1.233l.001.001,3.2295,3.229,3.2285,3.2295a.721.721,0,0,0,1.2315-.554Z"
    />
  </svg>`;
}

export function PinOnIcon({ width = 24, height = 24, hidden = false, title = "Pin On" } = {}) {
  return html`<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    width="${width}"
    height="${height}"
    viewBox="0 0 18 18"
    aria-hidden="${hidden ? "true" : "false"}"
    aria-label="${title}"
  >
    <rect opacity="0" width="18" height="18" />
    <path d="M2.823,14l1.1895,1.1905-1.87,1.8345a.25.25,0,0,1-.35355-.002l-.003-.003-.795-.83a.25.25,0,0,1,.004-.35Z" />
    <path
      d="M8.9775,16.1605,9,13.1445,13.1465,9l1.135-.0115A.72618.72618,0,0,0,14.789,7.749L12.5205,5.48,10.25,3.212a.723.723,0,0,0-1.2345.5055L9,4.854,4.8535,9,1.841,9.022a.72345.72345,0,0,0-.554,1.233l.001.001,3.2295,3.229L7.746,16.7145a.721.721,0,0,0,1.2315-.554Z"
    />
  </svg>`;
}
