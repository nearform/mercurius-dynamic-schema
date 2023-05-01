const fp = require('fastify-plugin')
const mercurius = require('mercurius')

const PLUGIN_NAME = 'mercuriusDynamicSchema'
const STRATEGY_NAME = 'mercuriusDynamicSchemaStrategy'

function strategyFactory({ name, strategy }) {
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
    // TBD: Opt validation
    const constraintStrategy = strategyFactory({
      name: STRATEGY_NAME,
      strategy: opts.strategy
    })

    fastify.addConstraintStrategy(constraintStrategy)

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
            path: schema?.path ?? '/',
            method: 'POST',
            constraints: { [STRATEGY_NAME]: schema.name },
            handler: (req, reply) => {
              // manage the body according the type
              let query = req.body

              if (typeof query !== 'string') {
                query = JSON.stringify(query)
              }

              console.log(query)
              // Improve query executor
              return reply.graphql(query)
            }
          })
        },
        { name: `${PLUGIN_NAME}.${schema.name}` }
      )
    }
  },
  { fastify: '4.x', name: PLUGIN_NAME }
)

module.exports = plugin
