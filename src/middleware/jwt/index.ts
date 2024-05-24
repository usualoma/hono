import type { JwtVariables } from './jwt'
export { jwt, verify, decode, sign } from './jwt'
import type {} from '../..'

declare module '../..' {
  interface ContextVariableMap extends JwtVariables {}
}
