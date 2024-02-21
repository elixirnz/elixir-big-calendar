/*eslint no-unused-vars: "off"*/

import noOverlap from './layout-algorithms/no-overlap'
import overlap from './layout-algorithms/overlap'
import tetris from './layout-algorithms/tetris'

const DefaultAlgorithms = {
  tetris: tetris,
  overlap: overlap,
  'no-overlap': noOverlap,
}

function isFunction(a) {
  return !!(a && a.constructor && a.call && a.apply)
}

//
export function getStyledEvents({
  events,
  minimumStartDifference,
  slotMetrics,
  accessors,
  dayLayoutAlgorithm, // one of DefaultAlgorithms keys
  // or custom function
}) {
  let algorithm = dayLayoutAlgorithm

  if (dayLayoutAlgorithm in DefaultAlgorithms)
    algorithm = DefaultAlgorithms[dayLayoutAlgorithm]

  if (!isFunction(algorithm)) {
    // invalid algorithm
    return []
  }

  return algorithm.apply(this, arguments)
}
