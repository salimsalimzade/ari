// The app's Vite compiles CSS Modules; this lets ui-kit type-check on its own.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
