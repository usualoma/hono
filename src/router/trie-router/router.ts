import type { Router } from '../../router'
import { Result } from '../../router'
import { Node } from './node'

export class TrieRouter<T> implements Router<T> {
  node: Node<{ score: number; handler: T }>
  scorer: (path: string) => any
  sortCompare: (a: { score: any }, b: { score: any }) => number

  constructor(init: Partial<Pick<TrieRouter<T>, 'scorer' | 'sortCompare'>> = {}) {
    this.node = new Node()
    Object.assign(this, init)

    if (!this.scorer) {
      let score = 0
      this.scorer = () => {
        score++
        return score
      }
    }

    if (!this.sortCompare) {
      this.sortCompare = (a, b) => (a.score > b.score ? 1 : a.score < b.score ? -1 : 0)
    }
  }

  add(method: string, path: string, handler: T) {
    this.node.insert(method, path, { score: this.scorer(path), handler: handler })
  }

  match(method: string, path: string): Result<T> {
    const result = this.node.search(method, path)
    if (!result) {
      return null
    }

    return new Result<T>(
      result.handlers.sort(this.sortCompare).map((h) => h.handler),
      result.params
    )
  }
}
