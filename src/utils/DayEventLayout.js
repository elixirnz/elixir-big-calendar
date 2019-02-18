import sortBy from 'lodash/sortBy'
import { accessor as get } from './accessors'


const OTHER_STARTS_EARLIER = -1;
const OTHER_STARTS_LATER   = 1;
const OTHER_STARTS_SAMETIME = 2;
const NOINT   = 0;

class Event {
  constructor(data, { startAccessor, endAccessor, slotMetrics }) {
    const {
      start,
      startDate,
      end,
      endDate,
      top,
      height,
    } = slotMetrics.getRange(get(data, startAccessor), get(data, endAccessor))

    this.start = start
    this.end = end
    this.startMs = +startDate
    this.endMs = +endDate
    this.top = top
    this.height = height
    this.data = data

    this.parent = null;
    this.colIndex = 0;
    this.numCols = 1;
  }


  intersects(e2) {
    if (this == e2) return NOINT;
    if (this.data && this.data.$rendering === 'background') return NOINT;
    if (e2.data && e2.data.$rendering === 'background') return NOINT;
    if (this.start == e2.start) return OTHER_STARTS_SAMETIME;
    if (this.start >= e2.start && this.start < e2.end) return OTHER_STARTS_EARLIER;
    if (e2.start >= this.start && e2.start < this.end) return OTHER_STARTS_LATER;
    return NOINT;
  }

  hasSpaceUnderFor(event) {
    if (this.parent == null || this.colIndex == 0) return null;
    
    let p = this;
    while (p = p.parent) {
      if (p.intersects(event) == NOINT) {
        return p;
      }
    }
  }

  getFirstIntersectingAscendent(event) {
    let p = this
    do {
      if ([
        OTHER_STARTS_LATER, OTHER_STARTS_SAMETIME
        ].includes(p.intersects(event))) 
      {
        return p
      }
    } while ( p = p.parent )
  }

  addToEventTree(event) {
    event.parent = this;

    const theEventAbove = this.hasSpaceUnderFor(event)
    if (theEventAbove) {
      event.colIndex = theEventAbove.colIndex; 
    } else {

      let p = this;
      do {
        p.numCols++;
      } while ( p = p.parent );
      event.colIndex = this.colIndex + 1; 
    }
    event.numCols = this.numCols;
  }

  /**
   * The event's width without any overlap.
   */
 /* get _width() {

    // @BACKGROUND-EVENTS-HACK
    if (
      this.data &&
      this.data.$rendering === 'background'
    ) {
      return 100
    }
    // @BACKGROUND-EVENTS-HACK

    if (this.container && this.container.end <= this.start) {
      return 100 - this.xOffset
    }
    // if (this.row && this.row.leaves.length == 0) {
    //   return 100;
    // }

    // The container event's width is determined by the maximum number of
    // events in any of its rows.
    if (this.rows) {
      const columns =
        this.rows.reduce(
          (max, row) => Math.max(max, row.leaves.length + 1), // add itself
          0
        ) + 1 // add the container
      return 100 / columns
    }

    let availableWidth = 100 - this.container._width

    // The row event's width is the space left by the container, divided
    // among itself and its leaves.
    if (this.leaves) {
      return availableWidth / (this.leaves.length + 1)
    }

    // The leaf event's width is determined by its row's width
    return this.row._width
  }
*/
  /**
   * The event's calculated width, possibly with extra width added for
   * overlapping effect.
   */
 /* get width() {
    // @BACKGROUND-EVENTS-HACK
    if (
      this.data &&
      this.data.$rendering === 'background'
    ) {
      return 100
    }
    // @BACKGROUND-EVENTS-HACK

    const noOverlap = this._width
    const overlap = Math.min(100, this._width * 1.7)

    // Containers can always grow.
    if (this.rows) {
      return overlap
    }

    // Rows can grow if they have leaves.
    if (this.leaves) {
      return this.leaves.length > 0 ? overlap : noOverlap
    }

    // Leaves can grow unless they're the last item in a row.
    const { leaves } = this.row
    const index = leaves.indexOf(this)
    return index === leaves.length - 1 ? noOverlap : overlap
  }

  get xOffset() {
    // @BACKGROUND-EVENTS-HACK
    if (
      this.data &&
      this.data.$rendering === 'background'
    ) {
      return 0
    }
    // @BACKGROUND-EVENTS-HACK

    // Containers have no offset.
    if (this.rows) return 0

    // Rows always start where their container ends.
    if (this.container && this.container.end > this.start && !this.row) {
      return this.container._width
    }
    try {
      // Leaves are spread out evenly on the space left by its row.
      const { leaves, xOffset, _width } = this.row
      const index = leaves.indexOf(this) + 1
      return xOffset + index * _width
    } catch (e) {
      return 0
    }
  }
  */
}
/**
 * Return true if event a and b is considered to be on the same row.
 */
function onSameRow(a, b) {
  return (
    // Occupies the same start slot.
    Math.abs(b.start - a.start) < 15 ||
    // A's start slot overlaps with b's end slot.
    (b.start > a.start && b.start < a.end)
  )
}

function sortByRender(events) {
  const sortedByTime = sortBy(events, ['startMs', e => -e.endMs])

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

function getStyledEvents({ events, ...props }) {
  /*// Create proxy events and order them so that we don't have
  // to fiddle with z-indexes.
  const proxies = events.map(event => new Event(event, props))
  const eventsInRenderOrder = sortByRender(proxies)

  console.log('styledEvents:', eventsInRenderOrder)

  // Group overlapping events, while keeping order.
  // Every event is always one of: container, row or leaf.
  // Containers can contain rows, and rows can contain leaves.
  const containerEvents = []
  for (let i = 0; i < eventsInRenderOrder.length; i++) {
    const event = eventsInRenderOrder[i]

    // Check if this event can go into a container event.
    const container = containerEvents.find(
      c => c.end > event.start
      //|| Math.abs(event.start - c.start) < 30
    )

    // Couldn't find a container — that means this event is a container.
    if (!container) {
      event.rows = []
      containerEvents.push(event)
      continue
    }

    // Found a container for the event.
    event.container = container

    // Check if the event can be placed in an existing row.
    // Start looking from behind.
    let row = null
    for (let j = container.rows.length - 1; !row && j >= 0; j--) {
      if (onSameRow(container.rows[j], event)) {
        row = container.rows[j]
      }
    }

    if (row) {
      // Found a row, so add it.
      row.leaves.push(event)
      event.row = row
    } else {
      // Couldn't find a row – that means this event is a row.
      event.leaves = []
      if (
        container.startMs <= event.startMs &&
        container.endMs > event.startMs
      ) {
        container.rows.push(event)
      }
    }
  }
*/


  const proxies = events.map(event => new Event(event, props))
  let eventsInRenderOrder = sortByRender(proxies)

  let EV = eventsInRenderOrder // just a shorthand

  EV = EV.sort((a,b) => {
    if (a.start < b.start) return -1;
    if (a.start > b.start) return 1;
    return 0;
  })
  for (let i = 0; i < EV.length; ++i) {

    //const intersectingEvent = EV[i].getFirstIntersectingAscendent(EV[i+1])

    let intersectingEvent = null;
    for (let j = i-1; j >= 0; --j) {
      if ([
        OTHER_STARTS_LATER, OTHER_STARTS_SAMETIME
        ].includes(EV[j].intersects(EV[i]))) 
      {
        intersectingEvent = EV[j]
        break;
      }
    }

    if (intersectingEvent) {
      intersectingEvent.addToEventTree(EV[i])
      continue;
    }
  }

  for (let e of EV) {
    e.xOffset = (100 / e.numCols) * e.colIndex;
    e.width = (100 / e.numCols)

    // stretch events to the right
    const rightNeighbor = EV.find(cev => cev.intersects(e) != NOINT && cev.colIndex > e.colIndex)
    if (!rightNeighbor) {
      e.width = (100 - e.xOffset)
    }

    // stretch events to the left
    const leftNeighbors = EV.filter(cev => cev.intersects(e) != NOINT && cev.colIndex < e.colIndex)
    let maxX = 0;
    for (let leftEvent of leftNeighbors) {
      maxX = Math.max(maxX, leftEvent.xOffset + leftEvent.width)
    }
    if (maxX < e.xOffset) {
      e.width += e.xOffset - maxX;
      e.xOffset = maxX;
    }
  }
  
  eventsInRenderOrder = EV;
/*
  let maxNumCols = 1;
  for (let i = 0; i < eventsInRenderOrder.length; ++i) {
    const ev = eventsInRenderOrder[ i ]
    const others = eventsInRenderOrder.filter(e => intersects(ev, e) == LATER)
    if (others.length + 1 > maxNumCols)
      maxNumCols = others.length + 1;
  }

  let cols = new Array(maxNumCols);
  for (let i = 0; i < maxNumCols; ++i) {
    cols[i] = []
  }

  for (let i = 0; i < eventsInRenderOrder.length; ++i) {
    const ev = eventsInRenderOrder[ i ]
    const others = eventsInRenderOrder.filter(e => intersects(ev, e) == LATER)
    if (others.length > 0) {
      ev.xOffset = (100/(others.length+1));
    } else {
      cols[0].push(ev)
    }
  }

  for (let i = 0; i < eventsInRenderOrder.length; ++i) {
    const ev = eventsInRenderOrder[ i ]

    if (ev.data && ev.data.$rendering === 'background') {
      ev.xOffset = 0; ev.width = 100;  
      continue;
    }

    ev.width = 100 / maxNumCols
    
    /*const others = eventsInRenderOrder.filter(e => (e.start < ev.start) && intersects(ev, e) != 0)
    if (others.length > 0) {
      for (let o of others) {
        if (intersects(o, ev) == 
      }
      /*for (let o of others) {
        o.numCols = (o.numCols || 1)+1
        o.col     = o.col || 0;
        o.width   = (100/o.numCols);
        o.xOffset = (100/o.numCols) * o.col;
      }
      ev.numCols = others.length + 1;
      ev.col = others.length;
      ev.width = 100 / ev.numCols;
      ev.xOffset = (100 / ev.numCols) * ev.col*/
    //}

  //}

  // Return the original events, along with their styles.
  return eventsInRenderOrder.map(event => ({
    event: event.data,
    style: {
      top    : event.top,
      height : event.height,
      width  : event.width,
      xOffset: event.xOffset,
    },
  }))
}

export { getStyledEvents }
