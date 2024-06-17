import type { HtmlEscapedCallback, HtmlEscapedString } from '../../utils/html'
import { JSXNode } from '../base'
import type { Child, Props } from '../base'
import type { FC, PropsWithChildren } from '../types'
import { raw } from '../../helper/html'
import { dataPrecedenceAttr, deDupeKeyMap } from './common'
import { PERMALINK } from '../constants'
import { toArray } from '../children'
import type { IntrinsicElements } from '../intrinsic-elements'

const metaTagMap: WeakMap<
  object,
  Record<string, [string, Props, string | undefined][]>
> = new WeakMap()
const insertIntoHead: (
  tagName: string,
  tag: string,
  props: Props,
  precedence: string | undefined
) => HtmlEscapedCallback =
  (tagName, tag, props, precedence) =>
  ({ buffer, context }): undefined => {
    if (!buffer) {
      return
    }
    const map = metaTagMap.get(context) || {}
    metaTagMap.set(context, map)
    const tags = (map[tagName] ||= [])

    let duped = false
    const deDupeKeys = deDupeKeyMap[tagName]
    if (deDupeKeys.length > 0) {
      LOOP: for (const [, tagProps] of tags) {
        for (const key of deDupeKeys) {
          if ((tagProps?.[key] ?? null) === props?.[key]) {
            duped = true
            break LOOP
          }
        }
      }
    }

    if (duped) {
      buffer[0] = buffer[0].replaceAll(tag, '')
    } else if (deDupeKeys.length > 0) {
      tags.push([tag, props, precedence])
    } else {
      tags.unshift([tag, props, precedence])
    }

    if (buffer[0].indexOf('</head>') !== -1) {
      let insertTags
      if (precedence === undefined) {
        insertTags = tags.map(([tag]) => tag)
      } else {
        const precedences: string[] = []
        insertTags = tags
          .map(([tag, , precedence]) => {
            let order = precedences.indexOf(precedence as string)
            if (order === -1) {
              precedences.push(precedence as string)
              order = precedences.length - 1
            }
            return [tag, order] as [string, number]
          })
          .sort((a, b) => a[1] - b[1])
          .map(([tag]) => tag)
      }

      insertTags.forEach((tag) => {
        buffer[0] = buffer[0].replaceAll(tag, '')
      })
      buffer[0] = buffer[0].replace(/(?=<\/head>)/, insertTags.join(''))
    }
  }

const returnWithoutSpecialBehavior = (tag: string, children: Child, props: Props) =>
  raw(new JSXNode(tag, props, toArray(children ?? [])).toString())

const documentMetadataTag = (tag: string, children: Child, props: Props, sort: boolean) => {
  if ('itemProp' in props) {
    return returnWithoutSpecialBehavior(tag, children, props)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let { precedence, blocking, ...restProps } = props
  precedence = sort ? precedence ?? '' : undefined
  if (sort) {
    restProps[dataPrecedenceAttr] = precedence
  }

  const string = new JSXNode(tag, restProps, toArray(children || [])).toString()

  if (string instanceof Promise) {
    return string.then((resString) =>
      raw(string, [
        ...((resString as HtmlEscapedString).callbacks || []),
        insertIntoHead(tag, resString, restProps, precedence),
      ])
    )
  } else {
    return raw(string, [insertIntoHead(tag, string, restProps, precedence)])
  }
}

export const title: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('title', children, props, false)
}
export const script: FC<PropsWithChildren<IntrinsicElements['script']>> = ({
  children,
  ...props
}) => {
  if (['src', 'async'].some((k) => !props[k])) {
    return returnWithoutSpecialBehavior('script', children, props)
  }

  return documentMetadataTag('script', children, props, false)
}

export const style: FC<PropsWithChildren<IntrinsicElements['style']>> = ({
  children,
  ...props
}) => {
  if (!['href', 'precedence'].every((k) => k in props)) {
    return returnWithoutSpecialBehavior('style', children, props)
  }
  props['data-href'] = props.href
  delete props.href
  return documentMetadataTag('style', children, props, true)
}
export const link: FC<PropsWithChildren<IntrinsicElements['link']>> = ({ children, ...props }) => {
  if (
    ['onLoad', 'onError'].some((k) => k in props) ||
    (props.rel === 'stylesheet' && (!('precedence' in props) || 'disabled' in props))
  ) {
    return returnWithoutSpecialBehavior('link', children, props)
  }
  return documentMetadataTag('link', children, props, 'precedence' in props)
}
export const meta: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('meta', children, props, false)
}
export const form: FC<
  PropsWithChildren<{
    action?: Function | string
    method?: 'get' | 'post'
  }>
> = ({ children, ...props }) => {
  if (typeof props.action === 'function') {
    props.action = PERMALINK in props.action ? (props.action[PERMALINK] as string) : undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new JSXNode('form', props, toArray(children ?? []) as Child[]) as any
}
