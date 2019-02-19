import React from 'react'
import BigCalendar from 'react-big-calendar'
import events from '../events'

let allViews = Object.keys(BigCalendar.Views).map(k => BigCalendar.Views[k])

console.lo
let Basic = () => (
  <BigCalendar
    events={events}
    views={allViews}
    defaultView={'day'}
    eventOverlapWidth={0.25}
    min={new Date('2011-01-01T06:15:00Z')}
    max={new Date('2011-01-01T10:30:00Z')}
    step={15}
    timeslots={1}
    showMultiDayTimes
    defaultDate={new Date(2015, 3, 1)}
  />
)

export default Basic
