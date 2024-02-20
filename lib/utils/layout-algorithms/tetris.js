"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getStyledEvents;
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _createForOfIteratorHelper2 = _interopRequireDefault(require("@babel/runtime/helpers/createForOfIteratorHelper"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _sortBy = _interopRequireDefault(require("lodash/sortBy"));
var _excluded = ["events"];
var OTHER_STARTS_EARLIER = -1;
var OTHER_STARTS_LATER = 1;
var OTHER_STARTS_SAMETIME = 2;
var NOINT = 0;
var Event = /*#__PURE__*/function () {
  function Event(data, _ref) {
    var accessors = _ref.accessors,
      slotMetrics = _ref.slotMetrics;
    (0, _classCallCheck2.default)(this, Event);
    var _slotMetrics$getRange = slotMetrics.getRange(accessors.start(data), accessors.end(data)),
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
  (0, _createClass2.default)(Event, [{
    key: "intersects",
    value: function intersects(e2) {
      if (this == e2) return NOINT;
      if (this.data && this.data.$rendering === 'background') return NOINT;
      if (e2.data && e2.data.$rendering === 'background') return NOINT;
      if (this.start == e2.start) return OTHER_STARTS_SAMETIME;
      if (this.start >= e2.start && this.start < e2.end) return OTHER_STARTS_EARLIER;
      if (e2.start >= this.start && e2.start < this.end) return OTHER_STARTS_LATER;
      return NOINT;
    }
  }]);
  return Event;
}();
function sortByRender(events) {
  var sortedByTime = (0, _sortBy.default)(events, ['startMs', function (e) {
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
    var _iterator = (0, _createForOfIteratorHelper2.default)(EV),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var e = _step.value;
        e.level = 999999;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    var eventsByLevel = {
      0: [EV[0]]
    };
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
      var _loop = function _loop() {
        var _lowerEvent$children;
        var lowerEvent = eventsByLevel[curLevel][i];
        var childEvents = eventsByLevel[curLevel + 1].filter(function (e) {
          return lowerEvent.intersects(e) != NOINT;
        });
        (_lowerEvent$children = lowerEvent.children).push.apply(_lowerEvent$children, (0, _toConsumableArray2.default)(childEvents));
        var _iterator2 = (0, _createForOfIteratorHelper2.default)(childEvents),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var ce = _step2.value;
            ce.parents.push(lowerEvent);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
        if (childEvents.length == 0 && curLevel + 1 < numLevels) {
          lowerEvent.localPeak = true;
          localPeaks.push(lowerEvent);
        }
      };
      for (var i = 0; i < eventsByLevel[curLevel].length; ++i) {
        _loop();
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
  var markStretchableEvents = function markStretchableEvents(eventsByLevel) {
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
            var _iterator3 = (0, _createForOfIteratorHelper2.default)(levelEvents[j].children),
              _step3;
            try {
              for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                var c = _step3.value;
                leastLevelsToStretch = Math.min(c.numLevelsToStretch, leastLevelsToStretch);
              }

              // find max local peak height
            } catch (err) {
              _iterator3.e(err);
            } finally {
              _iterator3.f();
            }
            var maxLocalPeakHeight = 0;
            var _iterator4 = (0, _createForOfIteratorHelper2.default)(levelEvents[j].children),
              _step4;
            try {
              for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                var _c = _step4.value;
                maxLocalPeakHeight = Math.max(_c.localPeakHeight, maxLocalPeakHeight);
              }
            } catch (err) {
              _iterator4.e(err);
            } finally {
              _iterator4.f();
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
      var _iterator5 = (0, _createForOfIteratorHelper2.default)(events),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var ev = _step5.value;
          if (ev.stretchable) {
            var s = 1 + ev.numLevelsToStretch / ev.localPeakHeight;
            ev.width = 100 / numLevels * s * (1 + eventOverlapWidth);
            if (curLevel == 0) {
              ev.xOffset = 0;
            } else {
              var maxXOffset = 0;
              var _iterator6 = (0, _createForOfIteratorHelper2.default)(ev.parents),
                _step6;
              try {
                for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
                  var p = _step6.value;
                  maxXOffset = Math.max(maxXOffset, p.xOffset + p.width * (1 - eventOverlapWidth));
                }
              } catch (err) {
                _iterator6.e(err);
              } finally {
                _iterator6.f();
              }
              ev.xOffset = maxXOffset;
            }

            // propagate localPeakHeight correctly back to top
            var _iterator7 = (0, _createForOfIteratorHelper2.default)(ev.children),
              _step7;
            try {
              for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
                var c = _step7.value;
                c.localPeakHeight = ev.localPeakHeight;
              }
            } catch (err) {
              _iterator7.e(err);
            } finally {
              _iterator7.f();
            }
          } else {
            ev.width = 100 / numLevels * (1 + eventOverlapWidth);
            if (curLevel == 0) {
              ev.xOffset = 0;
            } else {
              var _maxXOffset = 0;
              var _iterator8 = (0, _createForOfIteratorHelper2.default)(ev.parents),
                _step8;
              try {
                for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
                  var _p = _step8.value;
                  _maxXOffset = Math.max(_maxXOffset, _p.xOffset + _p.width * (1 - eventOverlapWidth));
                }
              } catch (err) {
                _iterator8.e(err);
              } finally {
                _iterator8.f();
              }
              ev.xOffset = _maxXOffset;
            }
          }
          if (ev.xOffset + ev.width > 100) {
            ev.width = 100 - ev.xOffset;
          }
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
    }
  };
  calculateDimensions(EV, eventsByLevel, eventOverlapWidth);
  return EV;
}
function getStyledEvents(_ref3) {
  var events = _ref3.events,
    props = (0, _objectWithoutProperties2.default)(_ref3, _excluded);
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
  var _iterator9 = (0, _createForOfIteratorHelper2.default)(bgEvents),
    _step9;
  try {
    for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
      var e = _step9.value;
      e.xOffset = 0;
      e.width = 100;
    }
  } catch (err) {
    _iterator9.e(err);
  } finally {
    _iterator9.f();
  }
  eventsInRenderOrder = [].concat((0, _toConsumableArray2.default)(bgEvents), (0, _toConsumableArray2.default)(EV));

  // Return the original events, along with their styles.
  var res = eventsInRenderOrder.map(function (event) {
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
  console.info('events(tetris): ', res);
  return res;
}