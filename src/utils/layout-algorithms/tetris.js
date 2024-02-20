import sortBy from 'lodash/sortBy'

const OTHER_STARTS_EARLIER = -1
const OTHER_STARTS_LATER = 1
const OTHER_STARTS_SAMETIME = 2
const NOINT = 0

class Event {
  constructor(data, { accessors, slotMetrics }) {
    const { start, startDate, end, endDate, top, height } =
      slotMetrics.getRange(accessors.start(data), accessors.end(data))

    this.start = start
    this.end = end
    this.startMs = +startDate
    this.endMs = +endDate
    this.top = top
    this.height = height
    this.data = data

    this.parents = [] // "bricks" on which this lies on
    this.children = [] // "bricks" that lie on this one
  }

  intersects(e2) {
    if (this == e2) return NOINT
    if (this.data && this.data.$rendering === 'background') return NOINT
    if (e2.data && e2.data.$rendering === 'background') return NOINT
    if (this.start == e2.start) return OTHER_STARTS_SAMETIME
    if (this.start >= e2.start && this.start < e2.end)
      return OTHER_STARTS_EARLIER
    if (e2.start >= this.start && e2.start < this.end) return OTHER_STARTS_LATER
    return NOINT
  }
}

function sortByRender(events) {
  const sortedByTime = sortBy(events, ['startMs', (e) => -e.endMs])

  const sorted = []
  while (sortedByTime.length > 0) {
    const event = sortedByTime.shift()
    sorted.push(event)

    for (let i = 0; i < sortedByTime.length; i++) {
      const test = sortedByTime[i]

      // Still inside this event, look for next.
      if (event.endMs > test.startMs) continue

      // We've found the first event of the next event group.
      // If that event is not right next to our current event, we have to
      // move it here.
      if (i > 0) {
        const event = sortedByTime.splice(i, 1)[0]
        sorted.push(event)
      }

      // We've already found the next event group, so stop looking.
      break
    }
  }

  return sorted
}

function alignEvents(EV, { eventOverlapWidth }) {
  const playTetrisWithEvents = (EV) => {
    for (let e of EV) e.level = 999999

    const eventsByLevel = { 0: [EV[0]] }
    EV[0].level = 0

    for (let i = 1; i < EV.length; ++i) {
      // find closest intersecting "brick", onto which we'll put the incoming "brick"
      let closest = null

      for (let j = i - 1; j >= 0; --j) {
        if (EV[j].intersects(EV[i]) != NOINT) {
          if (!closest) {
            closest = EV[j]
          } else if (closest.level < EV[j].level) {
            closest = EV[j]
          }
        }
      }

      if (closest) {
        EV[i].level = closest.level + 1 // we hit a "brick", put it on top
      } else {
        EV[i].level = 0 // we hit the floor
      }

      eventsByLevel[EV[i].level] = eventsByLevel[EV[i].level] || []
      eventsByLevel[EV[i].level].push(EV[i])
    }
    return eventsByLevel
  }

  const eventsByLevel = playTetrisWithEvents(EV)

  // Moving from bottom to top, try fitting upper level bricks into holes

  const fillHoles = (eventsByLevel) => {
    const intersectsWithAnyEventOnThisLevel = (thisLevel, upperLevelEvent) => {
      return (
        eventsByLevel[thisLevel].findIndex(
          (e) => e.intersects(upperLevelEvent) != NOINT
        ) != -1
      )
    }

    const numLevels = Object.keys(eventsByLevel).length

    for (let i = 0; i < numLevels - 1; ++i) {
      for (let j = i + 1; j < numLevels; ++j) {
        const upperLevel = eventsByLevel[j]

        for (let k = 0; k < upperLevel.length; ++k) {
          if (!intersectsWithAnyEventOnThisLevel(i, upperLevel[k])) {
            // move event down to this level
            upperLevel[k].level = i
            eventsByLevel[i].push(upperLevel[k])
            upperLevel.splice(k, 1)
            k--
          }
        }
      }
    }
  }

  fillHoles(eventsByLevel)

  const cleanupEventsByLevel = (eventsByLevel) => {
    for (let levelIndex in eventsByLevel) {
      if (eventsByLevel[levelIndex].length == 0) {
        delete eventsByLevel[levelIndex]
      }
    }
  }

  cleanupEventsByLevel(eventsByLevel)

  const assemblyIntersectionGraph = (eventsByLevel) => {
    const localPeaks = []

    const numLevels = Object.keys(eventsByLevel).length

    for (let curLevel = 0; curLevel < numLevels - 1; ++curLevel) {
      for (let i = 0; i < eventsByLevel[curLevel].length; ++i) {
        const lowerEvent = eventsByLevel[curLevel][i]

        const childEvents = eventsByLevel[curLevel + 1].filter(
          (e) => lowerEvent.intersects(e) != NOINT
        )

        lowerEvent.children.push(...childEvents)
        for (let ce of childEvents) ce.parents.push(lowerEvent)

        if (childEvents.length == 0 && curLevel + 1 < numLevels) {
          lowerEvent.localPeak = true
          localPeaks.push(lowerEvent)
        }
      }
    }

    return localPeaks
  }

  const localPeaks = assemblyIntersectionGraph(eventsByLevel)

  //console.log(eventsByLevel)

  const intersectWithUpperLevelEvents = (
    event,
    currentLevel,
    eventsByLevel
  ) => {
    const numLevels = Object.keys(eventsByLevel).length

    for (let i = currentLevel + 1; i < numLevels; ++i) {
      const intersectingEvent = eventsByLevel[i].find(
        (e) => e.intersects(event) != NOINT
      )
      if (intersectingEvent) {
        return intersectingEvent
      }
    }

    return null
  }

  const markStretchableEvents = (eventsByLevel) => {
    const numLevels = Object.keys(eventsByLevel).length

    for (let i = numLevels - 2; i >= 0; --i) {
      const levelEvents = eventsByLevel[i]

      for (let j = 0; j < levelEvents.length; ++j) {
        if (levelEvents[j].localPeak) {
          levelEvents[j].stretchable = true
          levelEvents[j].localPeakHeight = 1

          // find closest intersection on upper levelEvents
          const intersectingEvent = intersectWithUpperLevelEvents(
            levelEvents[j],
            i,
            eventsByLevel
          )
          if (intersectingEvent) {
            levelEvents[j].numLevelsToStretch = intersectingEvent.level - 1 - i // @FIXME: +-1?
          } else {
            levelEvents[j].numLevelsToStretch = numLevels - 1 - i // @FIXME or num Levels?
          }
        } else {
          const allChildrenStretchable =
            levelEvents[j].children.findIndex((e) => !e.stretchable) == -1

          if (allChildrenStretchable) {
            levelEvents[j].stretchable = true

            // find child that can stretch the least
            let leastLevelsToStretch = 9999
            for (let c of levelEvents[j].children) {
              leastLevelsToStretch = Math.min(
                c.numLevelsToStretch,
                leastLevelsToStretch
              )
            }

            // find max local peak height
            let maxLocalPeakHeight = 0
            for (let c of levelEvents[j].children) {
              maxLocalPeakHeight = Math.max(
                c.localPeakHeight,
                maxLocalPeakHeight
              )
            }

            levelEvents[j].localPeakHeight = maxLocalPeakHeight + 1
            levelEvents[j].numLevelsToStretch = leastLevelsToStretch
          }
        }
      }
    }
  }

  markStretchableEvents(eventsByLevel, localPeaks)

  const calculateDimensions = (EV, eventsByLevel, eventOverlapWidth) => {
    const numLevels = Object.keys(eventsByLevel).length

    for (let curLevel = 0; curLevel < numLevels; ++curLevel) {
      const events = eventsByLevel[curLevel]

      for (let ev of events) {
        if (ev.stretchable) {
          const s = 1 + ev.numLevelsToStretch / ev.localPeakHeight

          ev.width = (100 / numLevels) * s * (1 + eventOverlapWidth)

          if (curLevel == 0) {
            ev.xOffset = 0
          } else {
            let maxXOffset = 0
            for (let p of ev.parents) {
              maxXOffset = Math.max(
                maxXOffset,
                p.xOffset + p.width * (1 - eventOverlapWidth)
              )
            }

            ev.xOffset = maxXOffset
          }

          // propagate localPeakHeight correctly back to top
          for (let c of ev.children) {
            c.localPeakHeight = ev.localPeakHeight
          }
        } else {
          ev.width = (100 / numLevels) * (1 + eventOverlapWidth)

          if (curLevel == 0) {
            ev.xOffset = 0
          } else {
            let maxXOffset = 0
            for (let p of ev.parents) {
              maxXOffset = Math.max(
                maxXOffset,
                p.xOffset + p.width * (1 - eventOverlapWidth)
              )
            }

            ev.xOffset = maxXOffset
          }
        }

        if (ev.xOffset + ev.width > 100) {
          ev.width = 100 - ev.xOffset
        }
      }
    }
  }

  calculateDimensions(EV, eventsByLevel, eventOverlapWidth)

  return EV
}

export default function getStyledEvents({ events, ...props }) {
  const proxies = events.map((event) => new Event(event, props))
  let eventsInRenderOrder = sortByRender(proxies)

  let EV = eventsInRenderOrder // just a shorthand

  EV = EV.sort((a, b) => {
    if (a.start < b.start) return -1
    if (a.start > b.start) return 1
    return 0
  }).filter((e) => !(e.data && e.data.$rendering === 'background'))

  // TETRIS DOWN EVENTS

  if (EV.length > 0)
    EV = alignEvents(EV, {
      eventOverlapWidth: props.eventOverlapWidth || 0,
    })

  // background events span 0 to 100
  const bgEvents = eventsInRenderOrder.filter(
    (e) => e.data && e.data.$rendering === 'background'
  )
  for (let e of bgEvents) {
    e.xOffset = 0
    e.width = 100
  }

  eventsInRenderOrder = [...bgEvents, ...EV]

  // Return the original events, along with their styles.
  const res = eventsInRenderOrder.map((event) => ({
    event: event.data,
    style: {
      top: event.top,
      height: event.height,
      width: event.width,
      xOffset: event.xOffset,
    },
  }))
  console.info('events(tetris): ', res)
  return res
}
