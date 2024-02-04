import { raw } from '../helper/html'
import type { HtmlEscapedString } from '../utils/html'
import { JSXFragmentNode } from './base'
import { DOM_RENDERER } from './constants'
import { createContextProviderFunction } from './dom/context'
import type { FC, PropsWithChildren } from '.'

export interface Context<T> {
  values: T[]
  Provider: FC<PropsWithChildren<{ value: T }>>
}

export const globalContexts: Context<unknown>[] = []

export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  const context: Context<T> = {
    values,
    Provider(props): HtmlEscapedString | Promise<HtmlEscapedString> {
      values.push(props.value)
      let string
      try {
        string = props.children
          ? (Array.isArray(props.children)
              ? new JSXFragmentNode('', {}, props.children)
              : props.children
            ).toString()
          : ''
      } finally {
        values.pop()
      }

      if (string instanceof Promise) {
        return string.then((resString) =>
          raw(resString, (resString as HtmlEscapedString).callbacks)
        )
      } else {
        return raw(string)
      }
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(context.Provider as any)[DOM_RENDERER] = createContextProviderFunction(values)

  globalContexts.push(context as Context<unknown>)

  return context
}

export const useContext = <T>(context: Context<T>): T => {
  return context.values.at(-1) as T
}
