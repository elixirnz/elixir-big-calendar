'use strict';

exports.__esModule = true;
exports.getStyledEvents = undefined;

var _sortBy = require('lodash/sortBy');

var _sortBy2 = _interopRequireDefault(_sortBy);

var _accessors = require('./accessors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OTHER_STARTS_EARLIER = -1;
var OTHER_STARTS_LATER = 1;
var OTHER_STARTS_SAMETIME = 2;
var NOINT = 0;

var Event = function () {
  function Event(data, _ref) {
    var startAccessor = _ref.startAccessor,
        endAccessor = _ref.endAccessor,
        slotMetrics = _ref.slotMetrics;

    _classCallCheck(this, Event);

    var _slotMetrics$getRange = slotMetrics.getRange((0, _accessors.accessor)(data, startAccessor), (0, _accessors.accessor)(data, endAccessor)),
        start = _slotMetrics$getRange.start,
        startDate = _slotMetrics$getRange.startDate,
        end = _slotMetrics$getRange.end,
        endDate = _slotMetrics$getRange.endDate,
        top = _slotMetrics$getRange.top,
        height = _slotMetrics$getRange.height;

    this.start = start;
    this.end = end;
    this.startMs = +startDate;
    this.endMs = +endDate;
    this.top = top;
    this.height = height;
    this.data = data;

    this.parents = []; // "bricks" on which this lies on
    this.children = []; // "bricks" that lie on this one
  }

  Event.prototype.intersects = function intersects(e2) {
    if (this == e2) return NOINT;
    if (this.data && this.data.$rendering === 'background') return NOINT;
    if (e2.data && e2.data.$rendering === 'background') return NOINT;
    if (this.start == e2.start) return OTHER_STARTS_SAMETIME;
    if (this.start >= e2.start && this.start < e2.end) return OTHER_STARTS_EARLIER;
    if (e2.start >= this.start && e2.start < this.end) return OTHER_STARTS_LATER;
    return NOINT;
  };

  return Event;
}();

function sortByRender(events) {
  var sortedByTime = (0, _sortBy2.default)(events, ['startMs', function (e) {
    return -e.endMs;
  }]);

  var sorted = [];
  while (sortedByTime.length > 0) {
    var event = sortedByTime.shift();
    sorted.push(event);

    for (var i = 0; i < sortedByTime.length; i++) {
      var test = sortedByTime[i];

      // Still inside this event, look for next.
      if (event.endMs > test.startMs) continue;

      // We've found the first event of the next event group.
      // If that event is not right next to our current event, we have to
      // move it here.
      if (i > 0) {
        var _event = sortedByTime.splice(i, 1)[0];
        sorted.push(_event);
      }

      // We've already found the next event group, so stop looking.
      break;
    }
  }

  return sorted;
}

function alignEvents(EV, _ref2) {
  var eventOverlapWidth = _ref2.eventOverlapWidth;


  var playTetrisWithEvents = function playTetrisWithEvents(EV) {
    for (var _iterator = EV, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref3;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref3 = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref3 = _i.value;
      }

      var e = _ref3;
      e.level = 999999;
    }var eventsByLevel = { 0: [EV[0]] };
    EV[0].level = 0;

    for (var i = 1; i < EV.length; ++i) {

      // find closest intersecting "brick", onto which we'll put the incoming "brick"
      var closest = null;

      for (var j = i - 1; j >= 0; --j) {

        if (EV[j].intersects(EV[i]) != NOINT) {

          if (!closest) {
            closest = EV[j];
          } else if (closest.level < EV[j].level) {
            closest = EV[j];
          }
        }
      }

      if (closest) {
        EV[i].level = closest.level + 1; // we hit a "brick", put it on top
      } else {
        EV[i].level = 0; // we hit the floor
      }

      eventsByLevel[EV[i].level] = eventsByLevel[EV[i].level] || [];
      eventsByLevel[EV[i].level].push(EV[i]);
    }
    return eventsByLevel;
  };

  var eventsByLevel = playTetrisWithEvents(EV);

  // Moving from bottom to top, try fitting upper level bricks into holes

  var fillHoles = function fillHoles(eventsByLevel) {
    var intersectsWithAnyEventOnThisLevel = function intersectsWithAnyEventOnThisLevel(thisLevel, upperLevelEvent) {
      return eventsByLevel[thisLevel].findIndex(function (e) {
        return e.intersects(upperLevelEvent) != NOINT;
      }) != -1;
    };

    var numLevels = Object.keys(eventsByLevel).length;

    for (var i = 0; i < numLevels - 1; ++i) {

      for (var j = i + 1; j < numLevels; ++j) {

        var upperLevel = eventsByLevel[j];

        for (var k = 0; k < upperLevel.length; ++k) {
          if (!intersectsWithAnyEventOnThisLevel(i, upperLevel[k])) {
            // move event down to this level
            upperLevel[k].level = i;
            eventsByLevel[i].push(upperLevel[k]);
            upperLevel.splice(k, 1);
            k--;
          }
        }
      }
    }
  };

  fillHoles(eventsByLevel);

  var cleanupEventsByLevel = function cleanupEventsByLevel(eventsByLevel) {
    for (var levelIndex in eventsByLevel) {
      if (eventsByLevel[levelIndex].length == 0) {
        delete eventsByLevel[levelIndex];
      }
    }
  };

  cleanupEventsByLevel(eventsByLevel);

  var assemblyIntersectionGraph = function assemblyIntersectionGraph(eventsByLevel) {

    var localPeaks = [];

    var numLevels = Object.keys(eventsByLevel).length;

    for (var curLevel = 0; curLevel < numLevels - 1; ++curLevel) {
      var _loop = function _loop(i) {
        var _lowerEvent$children;

        var lowerEvent = eventsByLevel[curLevel][i];

        var childEvents = eventsByLevel[curLevel + 1].filter(function (e) {
          return lowerEvent.intersects(e) != NOINT;
        });

        (_lowerEvent$children = lowerEvent.children).push.apply(_lowerEvent$children, childEvents);
        for (var _iterator2 = childEvents, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
          var _ref4;

          if (_isArray2) {
            if (_i2 >= _iterator2.length) break;
            _ref4 = _iterator2[_i2++];
          } else {
            _i2 = _iterator2.next();
            if (_i2.done) break;
            _ref4 = _i2.value;
          }

          var ce = _ref4;
          ce.parents.push(lowerEvent);
        }if (childEvents.length == 0 && curLevel + 1 < numLevels) {
          lowerEvent.localPeak = true;
          localPeaks.push(lowerEvent);
        }
      };

      for (var i = 0; i < eventsByLevel[curLevel].length; ++i) {
        _loop(i);
      }
    }

    return localPeaks;
  };

  var localPeaks = assemblyIntersectionGraph(eventsByLevel);

  //console.log(eventsByLevel)

  var intersectWithUpperLevelEvents = function intersectWithUpperLevelEvents(event, currentLevel, eventsByLevel) {
    var numLevels = Object.keys(eventsByLevel).length;

    for (var i = currentLevel + 1; i < numLevels; ++i) {
      var intersectingEvent = eventsByLevel[i].find(function (e) {
        return e.intersects(event) != NOINT;
      });
      if (intersectingEvent) {
        return intersectingEvent;
      }
    }

    return null;
  };

  var markStretchableEvents = function markStretchableEvents(eventsByLevel, localPeaks) {
    var numLevels = Object.keys(eventsByLevel).length;

    for (var i = numLevels - 2; i >= 0; --i) {
      var levelEvents = eventsByLevel[i];

      for (var j = 0; j < levelEvents.length; ++j) {

        if (levelEvents[j].localPeak) {
          levelEvents[j].stretchable = true;
          levelEvents[j].localPeakHeight = 1;

          // find closest intersection on upper levelEvents
          var intersectingEvent = intersectWithUpperLevelEvents(levelEvents[j], i, eventsByLevel);
          if (intersectingEvent) {
            levelEvents[j].numLevelsToStretch = intersectingEvent.level - 1 - i; // @FIXME: +-1?
          } else {
            levelEvents[j].numLevelsToStretch = numLevels - 1 - i; // @FIXME or num Levels?
          }
        } else {
          var allChildrenStretchable = levelEvents[j].children.findIndex(function (e) {
            return !e.stretchable;
          }) == -1;

          if (allChildrenStretchable) {
            levelEvents[j].stretchable = true;

            // find child that can stretch the least
            var leastLevelsToStretch = 9999;
            for (var _iterator3 = levelEvents[j].children, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
              var _ref5;

              if (_isArray3) {
                if (_i3 >= _iterator3.length) break;
                _ref5 = _iterator3[_i3++];
              } else {
                _i3 = _iterator3.next();
                if (_i3.done) break;
                _ref5 = _i3.value;
              }

              var c = _ref5;

              leastLevelsToStretch = Math.min(c.numLevelsToStretch, leastLevelsToStretch);
            }

            // find max local peak height
            var maxLocalPeakHeight = 0;
            for (var _iterator4 = levelEvents[j].children, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
              var _ref6;

              if (_isArray4) {
                if (_i4 >= _iterator4.length) break;
                _ref6 = _iterator4[_i4++];
              } else {
                _i4 = _iterator4.next();
                if (_i4.done) break;
                _ref6 = _i4.value;
              }

              var _c = _ref6;

              maxLocalPeakHeight = Math.max(_c.localPeakHeight, maxLocalPeakHeight);
            }

            levelEvents[j].localPeakHeight = maxLocalPeakHeight + 1;
            levelEvents[j].numLevelsToStretch = leastLevelsToStretch;
          }
        }
      }
    }
  };

  markStretchableEvents(eventsByLevel, localPeaks);

  var calculateDimensions = function calculateDimensions(EV, eventsByLevel, eventOverlapWidth) {
    var numLevels = Object.keys(eventsByLevel).length;

    for (var curLevel = 0; curLevel < numLevels; ++curLevel) {
      var events = eventsByLevel[curLevel];

      for (var _iterator5 = events, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
        var _ref7;

        if (_isArray5) {
          if (_i5 >= _iterator5.length) break;
          _ref7 = _iterator5[_i5++];
        } else {
          _i5 = _iterator5.next();
          if (_i5.done) break;
          _ref7 = _i5.value;
        }

        var ev = _ref7;

        if (ev.stretchable) {
          var s = 1 + ev.numLevelsToStretch / ev.localPeakHeight;

          ev.width = 100 / numLevels * s * (1 + eventOverlapWidth);

          if (curLevel == 0) {
            ev.xOffset = 0;
          } else {

            var maxXOffset = 0;
            for (var _iterator6 = ev.parents, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
              var _ref8;

              if (_isArray6) {
                if (_i6 >= _iterator6.length) break;
                _ref8 = _iterator6[_i6++];
              } else {
                _i6 = _iterator6.next();
                if (_i6.done) break;
                _ref8 = _i6.value;
              }

              var p = _ref8;

              maxXOffset = Math.max(maxXOffset, p.xOffset + p.width * (1 - eventOverlapWidth));
            }

            ev.xOffset = maxXOffset;
          }

          // propagate localPeakHeight correctly back to top
          for (var _iterator7 = ev.children, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
            var _ref9;

            if (_isArray7) {
              if (_i7 >= _iterator7.length) break;
              _ref9 = _iterator7[_i7++];
            } else {
              _i7 = _iterator7.next();
              if (_i7.done) break;
              _ref9 = _i7.value;
            }

            var c = _ref9;

            c.localPeakHeight = ev.localPeakHeight;
          }
        } else {
          ev.width = 100 / numLevels * (1 + eventOverlapWidth);

          if (curLevel == 0) {
            ev.xOffset = 0;
          } else {

            var _maxXOffset = 0;
            for (var _iterator8 = ev.parents, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
              var _ref10;

              if (_isArray8) {
                if (_i8 >= _iterator8.length) break;
                _ref10 = _iterator8[_i8++];
              } else {
                _i8 = _iterator8.next();
                if (_i8.done) break;
                _ref10 = _i8.value;
              }

              var _p = _ref10;

              _maxXOffset = Math.max(_maxXOffset, _p.xOffset + _p.width * (1 - eventOverlapWidth));
            }

            ev.xOffset = _maxXOffset;
          }
        }

        if (ev.xOffset + ev.width > 100) {
          ev.width = 100 - ev.xOffset;
        }
      }
    }
  };

  calculateDimensions(EV, eventsByLevel, eventOverlapWidth);

  return EV;
}

function getStyledEvents(_ref11) {
  var events = _ref11.events,
      props = _objectWithoutProperties(_ref11, ['events']);

  var proxies = events.map(function (event) {
    return new Event(event, props);
  });
  var eventsInRenderOrder = sortByRender(proxies);

  var EV = eventsInRenderOrder; // just a shorthand


  EV = EV.sort(function (a, b) {
    if (a.start < b.start) return -1;
    if (a.start > b.start) return 1;
    return 0;
  }).filter(function (e) {
    return !(e.data && e.data.$rendering === 'background');
  });

  // TETRIS DOWN EVENTS

  if (EV.length > 0) EV = alignEvents(EV, {
    eventOverlapWidth: props.eventOverlapWidth || 0
  });

  // background events span 0 to 100
  var bgEvents = eventsInRenderOrder.filter(function (e) {
    return e.data && e.data.$rendering === 'background';
  });
  for (var _iterator9 = bgEvents, _isArray9 = Array.isArray(_iterator9), _i9 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
    var _ref12;

    if (_isArray9) {
      if (_i9 >= _iterator9.length) break;
      _ref12 = _iterator9[_i9++];
    } else {
      _i9 = _iterator9.next();
      if (_i9.done) break;
      _ref12 = _i9.value;
    }

    var e = _ref12;

    e.xOffset = 0;
    e.width = 100;
  }

  eventsInRenderOrder = [].concat(bgEvents, EV);

  // Return the original events, along with their styles.
  return eventsInRenderOrder.map(function (event) {
    return {
      event: event.data,
      style: {
        top: event.top,
        height: event.height,
        width: event.width,
        xOffset: event.xOffset
      }
    };
  });
}

exports.getStyledEvents = getStyledEvents;