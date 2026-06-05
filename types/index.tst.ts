import fastify, { type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import { type IResolvers } from 'mercurius'
import { expect } from 'tstyche'
import mercuriusDynamicSchema, {
  MercuriusDynamicSchemaEntry,
  MercuriusDynamicSchemaOptions
} from './index.js'

// Smoke tests: ensure the plugin registers with the documented option shapes.
// If a future change to index.d.ts breaks the public types, tsc inside tstyche
// will fail on one of the app.register(...) calls below.
const app = fastify()

// Register without options
app.register(mercuriusDynamicSchema)

const schema = `
    type Query {
      add(x: Int, y: Int): Int
    }
  `

const resolvers = {
  Query: {
    add: async (_: unknown, obj: { x: number; y: number }) => {
      const { x, y } = obj
      return x + y
    }
  }
}

const schema2 = `
    type Query {
      subtract(x: Int, y: Int): Int
    }
  `

const resolvers2 = {
  Query: {
    subtract: async (_: unknown, obj: { x: number; y: number }) => {
      const { x, y } = obj
      return x - y
    }
  }
}

// Register without context
app.register(mercuriusDynamicSchema, {
  schemas: [
    {
      name: 'schema1',
      schema,
      resolvers,
      path: '/custom-path'
    },
    {
      name: 'schema2',
      schema: schema2,
      resolvers: resolvers2
    }
  ],
  strategy: req => {
    return req.headers?.schema || 'schema1'
  }
})

// Register with context
app.register(mercuriusDynamicSchema, {
  schemas: [
    {
      name: 'schema1',
      schema,
      resolvers,
      path: '/custom-path'
    },
    {
      name: 'schema2',
      schema: schema2,
      resolvers: resolvers2
    }
  ],
  strategy: req => {
    return req.headers?.schema || 'schema1'
  },
  context: req => {
    return { add: req.headers.add }
  }
})

// The plugin's default export is a FastifyPluginAsync parameterised by
// MercuriusDynamicSchemaOptions (with default generics) or an empty object.
expect(mercuriusDynamicSchema).type.toBeAssignableTo<
  FastifyPluginAsync<MercuriusDynamicSchemaOptions | {}>
>()

// MercuriusDynamicSchemaOptions shape: required `schemas` array, required
// `strategy` returning a string or string[], and an optional `context`.
expect<MercuriusDynamicSchemaOptions>().type.toBe<{
  schemas: MercuriusDynamicSchemaEntry[]
  strategy: (arg0: FastifyRequest) => string | string[]
  context?: (arg0: FastifyRequest) => any
}>()

// MercuriusDynamicSchemaEntry shape: required `name`, `resolvers`, `schema`,
// and an optional `path`.
expect<MercuriusDynamicSchemaEntry>().type.toBe<{
  name: string
  path?: string
  resolvers: IResolvers
  schema: string
}>()
