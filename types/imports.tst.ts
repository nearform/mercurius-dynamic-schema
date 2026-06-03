// This file exists to verify that the public types of `./index.js` resolve
// correctly when the package is consumed by name. The bindings are type-only
// references; the runtime smoke tests live in `index.tst.ts`.
import mercuriusDynamicSchema, {
  MercuriusDynamicSchemaEntry,
  MercuriusDynamicSchemaOptions
} from './index.js'

// Keep references live so eslint does not flag the imports.
export type _Types = typeof mercuriusDynamicSchema &
  MercuriusDynamicSchemaEntry &
  MercuriusDynamicSchemaOptions
