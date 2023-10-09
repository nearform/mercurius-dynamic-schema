import fp from 'fastify-plugin'
import mercurius from 'mercurius'

const PLUGIN_NAME = 'mercuriusDynamicSchema'
const STRATEGY_NAME = 'mercuriusDynamicSchemaStrategy'
const kRequestContext = Symbol('request context')

function strategyFactory ({ name, strategy }) {
  return {
    name,
    storage: function () {
      const handlers = {}
      return {
        get: type => {
          return handlers[type] || null
        },
        set: (type, store) => {
          handlers[type] = store
        }
      }
    },
    deriveConstraint: strategy,
    mustMatchWhenDerived: true
  }
}

const plugin = fp(
  async function (fastify, opts) {
    const constraintStrategy = strategyFactory({
      name: STRATEGY_NAME,
      strategy: opts.strategy
    })

    fastify.addConstraintStrategy(constraintStrategy)

    const contextFn = opts.context

    for (const schema of opts.schemas) {
      await fastify.register(
        async childServer => {
          childServer.register(mercurius, {
            schema: schema.schema,
            resolvers: schema.resolvers,
            graphiql: false,
            routes: false
          })

          childServer.route({
            path: schema?.path ?? '/graphql',
            method: 'POST',
            constraints: { [STRATEGY_NAME]: schema.name },
            handler: async (req, reply) => {
              let { query, operationName, variables } = req.body

              if (typeof req.body === 'string') {
                query = req.body
              }

              if (contextFn) {
                req[kRequestContext] = await contextFn(req, reply)
                Object.assign(req[kRequestContext], { reply, childServer })
              } else {
                req[kRequestContext] = { reply, app: childServer }
              }

              return reply.graphql(
                query,
                req[kRequestContext],
                variables,
                operationName
              )
            }
          })
        },
        { name: `${PLUGIN_NAME}.${schema.name}` }
      )
    }
  },
  { fastify: '4.x', name: PLUGIN_NAME }
)

export default plugin
