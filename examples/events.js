export default [
  {
    id: 0,
    title: 'All Day Event very long title',
    allDay: true,
    start: new Date(2015, 3, 0),
    end: new Date(2015, 3, 1),
  },
  {
    id: 1,
    title: 'Long Event',
    start: new Date(2015, 3, 7),
    end: new Date(2015, 3, 10),
  },

  {
    id: 2,
    title: 'DTS STARTS',
    start: new Date(2016, 2, 13, 0, 0, 0),
    end: new Date(2016, 2, 20, 0, 0, 0),
  },

  {
    id: 3,
    title: 'DTS ENDS',
    start: new Date(2016, 10, 6, 0, 0, 0),
    end: new Date(2016, 10, 13, 0, 0, 0),
  },

  {
    id: 4,
    title: 'Some Event',
    start: new Date(2015, 3, 9, 0, 0, 0),
    end: new Date(2015, 3, 9, 0, 0, 0),
  },
  {
    id: 5,
    title: 'Conference',
    start: new Date(2015, 3, 11),
    end: new Date(2015, 3, 13),
    desc: 'Big conference for important people',
  },
  {
    id: 6,
    title: 'Meeting',
    start: new Date(2015, 3, 12, 10, 30, 0, 0),
    end: new Date(2015, 3, 12, 12, 30, 0, 0),
    desc: 'Pre-meeting meeting, to prepare for the meeting',
  },
  {
    id: 7,
    title: 'Lunch',
    start: new Date(2015, 3, 12, 12, 0, 0, 0),
    end: new Date(2015, 3, 12, 13, 0, 0, 0),
    desc: 'Power lunch',
  },
  {
    id: 8,
    title: 'Meeting',
    start: new Date(2015, 3, 12, 14, 0, 0, 0),
    end: new Date(2015, 3, 12, 15, 0, 0, 0),
  },
  {
    id: 9,
    title: 'Happy Hour',
    start: new Date(2015, 3, 12, 17, 0, 0, 0),
    end: new Date(2015, 3, 12, 17, 30, 0, 0),
    desc: 'Most important meal of the day',
  },
  {
    id: 10,
    title: 'Dinner',
    start: new Date(2015, 3, 12, 20, 0, 0, 0),
    end: new Date(2015, 3, 12, 21, 0, 0, 0),
  },
  {
    id: 11,
    title: 'Birthday Party',
    start: new Date(2015, 3, 13, 7, 0, 0),
    end: new Date(2015, 3, 13, 10, 30, 0),
  },
  {
    id: 12,
    title: 'Late Night Event',
    start: new Date(2015, 3, 17, 19, 30, 0),
    end: new Date(2015, 3, 18, 2, 0, 0),
  },
  {
    id: 13,
    title: 'Multi-day Event',
    start: new Date(2015, 3, 20, 19, 30, 0),
    end: new Date(2015, 3, 22, 2, 0, 0),
  },
  {
    id: 14,
    title: 'Today',
    start: new Date(new Date().setHours(new Date().getHours() - 3)),
    end: new Date(new Date().setHours(new Date().getHours() + 3)),
  },
  {
    id   : 15,
    title: 'EEEEEEEE 0',
    start: new Date('2015-04-01T09:00:00Z'),
    end  : new Date('2015-04-01T09:15:00Z'),
    desc : 'Power lunch',
  },
  {
    id   : 16,
    title: 'EEEEEEEE 1',
    start: new Date('2015-04-01T09:15:00Z'),
    end  : new Date('2015-04-01T09:30:00Z'),
    desc : 'Power lunch',
  },
  {
    id   : 17,
    title: 'EEEEEEEE 2',
    start: new Date('2015-04-01T09:30:00Z'),
    end  : new Date('2015-04-01T09:45:00Z'),
    desc : 'Power lunch',
  },

  {
    id   : 18,
    title: 'EEEEEEEE 3',
    start: new Date('2015-04-01T09:40:00Z'),
    end  : new Date('2015-04-01T10:00:00Z'),
    desc : 'Power lunch',
  },/*
  {
    id   : 19,
    title: 'EEEEEEEE 4',
    start: new Date('2015-04-01T08:45:00Z'),
    end  : new Date('2015-04-01T10:30:00Z'),
    desc : 'All embedding',
  },*/
  {
    id   : 20,
    title: 'EEEEEEEE 5',
    start: new Date('2015-04-01T09:45:00Z'),
    end  : new Date('2015-04-01T10:00:00Z'),
    desc : '',
  },
]
