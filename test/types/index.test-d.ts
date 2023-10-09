import fastify from 'fastify'
import mercuriusDynamicSchema from '../..'

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
    add: async (_: any, obj: any) => {
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
    subtract: async (_: any, obj: any) => {
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
