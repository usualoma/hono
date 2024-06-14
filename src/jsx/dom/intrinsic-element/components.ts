import type { Props } from '../../base'
import type { FC, JSXNode, PropsWithChildren, RefObject } from '../../types'
import { newJSXNode } from '../utils'
import { createPortal, getNameSpaceContext } from '../render'
import { useContext } from '../../context'
import { use, useCallback, useMemo, useState } from '../../hooks'
import { FormContext, registerAction } from '../hooks'
import { deDupeKeys, domRenderers } from '../../intrinsic-element/common'

const composeRef = <T>(
  ref: RefObject<T> | Function | undefined,
  cb: (e: T) => void | (() => void)
): ((e: T) => void | (() => void)) => {
  return useMemo(
    () => (e: T) => {
      let refCleanup: (() => void) | undefined
      if (ref) {
        if (typeof ref === 'function') {
          refCleanup =
            ref(e) ||
            (() => {
              ref(null)
            })
        } else if (ref && 'current' in ref) {
          ref.current = e
        }
      }

      const cbCleanup = cb(e)
      return () => {
        cbCleanup?.()
        refCleanup!()
      }
    },
    [ref]
  )
}

const precedenceMap: WeakMap<HTMLElement, string> = new WeakMap()
const blockingPromiseMap: Record<string, Promise<Event> | undefined> = Object.create(null)
const documentMetadataTag = (
  tag: string,
  props: Props,
  deDupe: boolean,
  sort: boolean,
  blocking: boolean
) => {
  if (props?.itemProp) {
    return newJSXNode({
      tag,
      props,
    })
  }

  let { onLoad, onError, precedence, ...restProps } = props
  let element: HTMLElement | null = null

  if (deDupe) {
    document.head.querySelectorAll<HTMLElement>(tag).forEach((e) => {
      if (deDupeKeys[tag].length === 0) {
        element = e
      } else {
        for (const key of deDupeKeys[tag]) {
          if ((e.getAttribute(key) ?? undefined) === props[key]) {
            element = e
            break
          }
        }
      }
    })
  }

  if (props.disabled) {
    if (element) {
      ;(element as HTMLElement).remove()
    }
    return null
  }

  let nextNode: HTMLElement | null = null
  precedence = sort ? precedence ?? '' : undefined
  if (precedence && !element) {
    let found = false
    for (const e of [...document.head.querySelectorAll<HTMLElement>(tag)]) {
      if (found) {
        nextNode = e
        break
      }
      if (precedenceMap.get(e) === precedence) {
        found = true
      }
    }
  }

  const ref = composeRef(props.ref, (e: HTMLElement) => {
    const key = deDupeKeys[tag][0]
    if (precedence) {
      precedenceMap.set(e, precedence)
    }
    const promise = (blockingPromiseMap[e.getAttribute(key) as string] ||= new Promise<Event>(
      (resolve, reject) => {
        e.addEventListener('load', (e) => {
          resolve(e)
        })
        e.addEventListener('error', (e) => {
          reject(e)
        })
      }
    ))
    if (onLoad) {
      promise.then(onLoad)
    }
    if (onError) {
      promise.catch(onError)
    }
  })

  if (blocking && props?.blocking === 'render') {
    const key = deDupeKeys[tag][0]
    if (props[key]) {
      const value = props[key]
      const promise = (blockingPromiseMap[value] ||= new Promise<Event>((resolve, reject) => {
        const e = document.createElement(tag)
        e.setAttribute(key, value)
        document.head.insertBefore(e, nextNode)
        e.addEventListener('load', (e) => {
          resolve(e)
        })
        e.addEventListener('error', (e) => {
          reject(e)
        })
      }))
      use(promise)
    }
  }

  const jsxNode = newJSXNode({
    tag,
    props: {
      ...restProps,
      ref,
    },
  }) as JSXNode & { e?: HTMLElement; nN?: { e?: HTMLElement } }

  if (element) {
    jsxNode.e = element
  }
  if (nextNode) {
    jsxNode.nN = { e: nextNode }
  }

  return createPortal(
    jsxNode,
    document.head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
}
export const title: FC<PropsWithChildren> = (props) => {
  const nameSpaceContext = getNameSpaceContext()
  const ns = nameSpaceContext && useContext(nameSpaceContext)
  if (ns?.endsWith('svg')) {
    return newJSXNode({
      tag: 'title',
      props,
    })
  }
  return documentMetadataTag('title', props, true, false, false)
}

export const script: FC<
  PropsWithChildren<{
    async?: boolean
  }>
> = (props) => {
  return documentMetadataTag('script', props, !!props.async, false, true)
}

export const style: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('style', props, true, true, true)
}

export const link: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('link', props, true, true, true)
}

export const meta: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('meta', props, true, true, false)
}

export const form: FC<
  PropsWithChildren<{
    action?: Function | string
    method?: 'get' | 'post'
    ref?: RefObject<HTMLFormElement> | ((e: HTMLFormElement | null) => void | (() => void))
  }>
> = (props) => {
  const { action, ...restProps } = props
  if (typeof action !== 'function') {
    return newJSXNode({
      tag: 'form',
      props,
    })
  }

  const [data, setData] = useState<FormData | null>(null)
  const onSubmit = useCallback<(e: SubmitEvent) => void>(async (e: Event) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    setData(formData)
    const actionRes = action(formData)
    if (actionRes instanceof Promise) {
      registerAction(actionRes)
      await actionRes
    }
    setData(null)
  }, [])

  const ref = composeRef(props.ref, (e: HTMLFormElement) => {
    e.addEventListener('submit', onSubmit)
    return () => {
      e.removeEventListener('submit', onSubmit)
    }
  })

  return newJSXNode({
    tag: FormContext as unknown as Function,
    props: {
      value: {
        pending: data !== null,
        data,
        method: data ? props.method || 'get' : null,
        action: data ? action : null,
      },
      children: newJSXNode({
        tag: 'form',
        props: {
          ...restProps,
          ref,
        },
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

Object.assign(domRenderers, {
  title,
  script,
  style,
  link,
  meta,
  form,
})
