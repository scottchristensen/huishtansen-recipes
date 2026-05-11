// Class fragment that swaps the native select chevron for a custom one.
// The actual styles live in src/app/globals.css under .select-chevron
// because Tailwind's arbitrary url syntax was choking on the embedded
// SVG quotes during build.
export const selectChevronClasses = "select-chevron";
