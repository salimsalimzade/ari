// The app's Vite compiles the Sass modules; this lets ui-kit type-check on its own.
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
