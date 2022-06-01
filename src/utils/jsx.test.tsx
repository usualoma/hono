/* @jsx jsx */
import { Hono } from '../hono'
import { jsx } from '../utils/jsx'

describe('JSX', () => {
  const app = new Hono()

  app.get('/hello/:name', (c) => {
    const { name } = c.req.param()
    return <div>Hello {name}!</div>
  })

  it('request', async () => {
    const res = await app.request('http://localhost/hello/hono')
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/)
    expect(await res.text()).toBe('<div>Hello hono!</div>')
  })
})
