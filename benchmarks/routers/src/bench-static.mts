import { run, bench, group } from 'mitata'
import { expressRouter } from './express.mts'
import { findMyWayRouter } from './find-my-way.mts'
import { regExpRouter, staticRouter, trieRouter } from './hono.mts'
import { koaRouter } from './koa-router.mts'
import { koaTreeRouter } from './koa-tree-router.mts'
import { medleyRouter } from './medley-router.mts'
import type { Route, RouterInterface } from './tool.mts'
import { trekRouter } from './trek-router.mts'

const routers: RouterInterface[] = [
  regExpRouter,
  staticRouter,
  trieRouter,
  medleyRouter,
  findMyWayRouter,
  koaTreeRouter,
  trekRouter,
  expressRouter,
  koaRouter,
]

medleyRouter.match({ method: 'GET', path: '/user' })

const routes: (Route & { name: string })[] = [
  {
    name: 'short static',
    method: 'GET',
    path: '/user',
  },
  {
    name: 'static with same radix',
    method: 'GET',
    path: '/user/comments',
  },
  {
    name: 'long static',
    method: 'GET',
    path: '/very/deeply/nested/route/hello/there',
  },
]

for (const route of routes) {
  group(`${route.name} - ${route.method} ${route.path}`, () => {
    for (const router of routers) {
      bench(router.name, async () => {
        router.match(route)
      })
    }
  })
}

group('all together', () => {
  for (const router of routers) {
    bench(router.name, async () => {
      for (const route of routes) {
        router.match(route)
      }
    })
  }
})

await run()
