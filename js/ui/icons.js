// Inline SVG sprite (stroke icons, 24x24). Reference with icon('name') from dom.js.
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h4.5v-5h4v5h4.5V10"/>',
  'sound-on': '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  'sound-off': '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9M12 17.2v.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  shuffle: '<path d="M3.5 7H7c4 0 5 10 9 10h4M3.5 17H7c1.6 0 2.7-1.6 3.7-3.4M13.4 9.4C14.4 8 15.2 7 16.5 7H20"/><path d="m17.5 4 3 3-3 3M17.5 14l3 3-3 3"/>',
  'chev-l': '<path d="m15 5-7 7 7 7"/>',
  'chev-r': '<path d="m9 5 7 7-7 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  trash: '<path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18.5 14.4c1.6.8 2.5 2.3 2.5 5.1"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V15c0 4-3 7-7 7h-1c-2.5 0-4.2-1-5.6-3L3.8 14.8a1.5 1.5 0 0 1 2.4-1.8L8 15"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  'eye-off': '<path d="M3 3l18 18M10.6 5.7c.4-.1.9-.2 1.4-.2 6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.5 7.2A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8M9.9 9.9a2.8 2.8 0 0 0 4.2 3.7"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 1.5M9.5 2.5h5"/>',
  swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  steal: '<path d="M4 12h12M12 7l5 5-5 5"/><circle cx="19.5" cy="12" r="1" />',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  'cat-professions': '<rect x="3.5" y="8" width="17" height="11.5" rx="2.5"/><path d="M9 8V5.5h6V8M3.5 13.5h17"/>',
  'cat-animals': '<circle cx="7" cy="9.5" r="1.9"/><circle cx="12" cy="6.5" r="1.9"/><circle cx="17" cy="9.5" r="1.9"/><path d="M12 12.5c-3 0-5.5 2.5-5.5 4.6 0 1.4 1.2 2.4 2.8 2.4 1 0 1.7-.4 2.7-.4s1.7.4 2.7.4c1.6 0 2.8-1 2.8-2.4 0-2.100-2.500-4.600-5.500-4.600z"/>',
  'cat-objects': '<path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2zM4 7.2l8 4.3 8-4.300M12 11.5V21"/>',
  'cat-actions': '<circle cx="14.5" cy="4.8" r="2"/><path d="m11 21 2-6-3-3 1.5-4.5 3.500 1.500 2.500 3M7 11.500 9.500 8M13 15l3.500 1.500"/>',
  'cat-places': '<path d="M12 21.5s7-6.200 7-11.500a7 7 0 0 0-14 0c0 5.300 7 11.500 7 11.500z"/><circle cx="12" cy="10" r="2.600"/>',
  'cat-sports': '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.500 5.500c3 3 3 10 0 13M18.500 5.500c-3 3-3 10 0 13"/>',
  'cat-foods': '<path d="M7 3v8M4.500 3v5a2.500 2.500 0 0 0 5 0V3M7 11v10M17 3c-2.500 1.500-3.500 4-3.500 7 0 1.500.7 2.500 2 2.800V21M17 3v9.800"/>',
};
export function installIcons() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true">${
    Object.entries(P).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}
