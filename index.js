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

async function mercuriusDynamicSchema(fastify, opts) {
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
          path: schema.path,
          resolvers: schema.resolvers,
          graphiql: false,
          context: contextFn,
          routes: true,
          additionalRouteOptions: {
            constraints: { [STRATEGY_NAME]: schema.name }
          }
        })
      },
      { name: `${PLUGIN_NAME}.${schema.name}` }
    )
  }
}

module.exports = fp(mercuriusDynamicSchema, {
  fastify: '5.x',
  name: PLUGIN_NAME
})
module.exports.default = mercuriusDynamicSchema
module.exports.mercuriusDynamicSchema = mercuriusDynamicSchema
