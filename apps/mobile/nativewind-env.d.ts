/// <reference types="nativewind/types" />

// Lets `import "./global.css"` type-check (TypeScript 6 checks side-effect imports).
declare module "*.css";
