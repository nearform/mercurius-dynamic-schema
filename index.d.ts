import { FastifyInstance, FastifyRequest } from 'fastify'
import { IResolvers, MercuriusContext } from 'mercurius'

/**
 * Mercurius Dynamic schema entry.
 */
export type MercuriusDynamicSchemaEntry<TParent = any, TArgs = any, TContext = MercuriusContext> = {
  name: string
  path?: string
  resolvers: IResolvers
  schema: string
}

/**
 * Mercurius dynamic schema options.
 */
export interface MercuriusDynamicSchemaOptions<TParent = any, TArgs = any, TContext = MercuriusContext> {
  /**
   * The dynamic schemas definition for the Mercurius GraphQL server.
   */
  schemas: MercuriusDynamicSchemaEntry<TParent, TArgs, TContext>[]
  strategy: (arg0: FastifyRequest) => string | string[]
  context?: (arg0: FastifyRequest) => any
}

export default MercuriusDynamicSchema

/** Mercurius Dynamic Schema is a plugin for `mercurius` that allows using separate schemas based on request parameters. */
declare function MercuriusDynamicSchema (
  instance: FastifyInstance,
  opts: MercuriusDynamicSchemaOptions
): Promise<void>;

declare namespace MercuriusDynamicSchema {}