declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jsx.JSX {
    interface IntrinsicElements {
      [tagName: string]: Record<string, string>
    }
  }
}

export function jsx(
  tagName: string,
  props: Record<string, string>,
  ...children: string[]
): Response {
  let attrs = ''
  const propsKeys = Object.keys(props || {})
  for (let i = 0, len = propsKeys.length; i < len; i++) {
    attrs += ` ${propsKeys[i]}="${props[propsKeys[i]]}"` // should be escaped
  }
  const bodyData = `<${tagName}${attrs}>${children
    .map((c) => (typeof c === 'object' ? (c as any).bodyData : c)) // escape variable?
    .join('')}</${tagName}>`
  const resp = new Response(bodyData, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  })
  ;(resp as any).bodyData = bodyData
  return resp
}
