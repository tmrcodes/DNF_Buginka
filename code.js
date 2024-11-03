figma.showUI(__html__, { width: 300, height: 400 });

const DateUtils = {
  getISOWeekNumber: function(date) {
    const tmpDate = new Date(date.getTime());
    tmpDate.setHours(0, 0, 0, 0);
    tmpDate.setDate(tmpDate.getDate() + 4 - (tmpDate.getDay() || 7));
    const yearStart = new Date(tmpDate.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((tmpDate - yearStart) / 86400000) + 1) / 7);
    return weekNumber;
  },

  getWeeksInYear: function(year) {
    const d = new Date(Date.UTC(year, 11, 31));
    const week = this.getISOWeekNumber(d);
    const totalWeeks = week === 1 ? 52 : week;
    return totalWeeks;
  },

  getDatesForWeek: function(weekNumber, year) {
    const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7));
    const dow = simple.getUTCDay();
    const ISOweekStart = new Date(simple);
    if (dow <= 4) {
      ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    } else {
      ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    }
    const dates = Array.from({ length: 7 }, function(_, i) {
      const d = new Date(ISOweekStart);
      d.setUTCDate(ISOweekStart.getUTCDate() + i);
      return d;
    });
    return dates;
  },

  formatDateInRussian: function(date) {
    const monthNames = [
      "января", "февраля", "марта", "апреля", "мая", "июня",
      "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = monthNames[date.getUTCMonth()];
    const formattedDate = `${day} ${month}`;
    return formattedDate;
  },

  getDayOfWeekInRussian: function(date) {
    const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
    const dayIndex = date.getUTCDay() || 7;
    const dayName = daysOfWeek[dayIndex - 1];
    return dayName;
  },

  parseRussianDate: function(dateStr) {
    const monthNames = {
      "января": 0,
      "февраля": 1,
      "марта": 2,
      "апреля": 3,
      "мая": 4,
      "июня": 5,
      "июля": 6,
      "августа": 7,
      "сентября": 8,
      "октября": 9,
      "ноября": 10,
      "декабря": 11
    };

    const parts = dateStr.trim().split(' ');
    if (parts.length !== 2) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const monthName = parts[1].toLowerCase();
    const month = monthNames[monthName];

    if (isNaN(day) || month === undefined) {
      return null;
    }

    const year = new Date().getFullYear();
    const parsedDate = new Date(Date.UTC(year, month, day));
    return parsedDate;
  },
};

const NodeUtils = {
  findTextLayer: function(node, layerName, skipInstances = false) {
    if (skipInstances && node.type === 'INSTANCE') {
      return null;
    }
    if (node.type === 'TEXT' && node.name === layerName) {
      if (skipInstances && isNodeInsideInstance(node)) {
        return null;
      }
      return node;
    }
    if ('children' in node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const found = this.findTextLayer(child, layerName, skipInstances);
        if (found) return found;
      }
    }
    return null;
  },

  findWeekDayTextLayers: function(frame) {
    const weekDayLayers = frame.findAll(function(node) {
      return node.type === 'TEXT' && /^WeekDay\d+$/.test(node.name);
    });
    return weekDayLayers;
  },

  findContentTextLayers: function(frame) {
    const contentLayers = frame.findAll(node =>
        node.type === 'TEXT' && (
            /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/.test(node.name) ||
            /^Content\s\d+$/.test(node.name)
        )
    );
    return contentLayers;
  },

  logFrameStructure: function(frame) {
    frame.findAll().forEach(function(node) {
      // Placeholder for frame structure logging
    });
  },
};

function isNodeInsideInstance(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'INSTANCE') {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function isPageHeaderInstance(node) {
  return node.type === 'INSTANCE' && 
         ['Page Header', 'Bet Taqyryby', 'Bet Taqyryby LR', 'Bet Taqyryby JAG'].includes(node.name);
}

const FontUtils = {
  loadAllFonts: function() {
    return new Promise(function(resolve, reject) {
      const selectedNodes = figma.currentPage.selection;
      if (selectedNodes.length === 0) {
        resolve();
        return;
      }
      const selectedFrame = selectedNodes[0];
      const textNodes = selectedFrame.findAllWithCriteria({ types: ['TEXT'] });
      const fontsToLoad = new Set();

      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        if (node.type === 'TEXT') {
          const charactersLength = node.characters.length;
          if (charactersLength > 0) {
            try {
              const fontNames = node.getRangeAllFontNames(0, charactersLength);
              for (let j = 0; j < fontNames.length; j++) {
                const fontName = fontNames[j];
                fontsToLoad.add(`${fontName.family}-${fontName.style}`);
              }
            } catch (error) {
              // Handle error silently
            }
          } else {
            const fontName = node.fontName;
            if (fontName !== figma.mixed) {
              fontsToLoad.add(`${fontName.family}-${fontName.style}`);
            }
          }
        }
      }

      const fontPromises = [];
      fontsToLoad.forEach(function(font) {
        const fontParts = font.split('-');
        const family = fontParts[0];
        const style = fontParts[1];
        fontPromises.push(
          figma.loadFontAsync({ family: family, style: style }).catch(function(error) {
            // Handle error silently
          })
        );
      });

      Promise.all(fontPromises).then(function() {
        resolve();
      }).catch(function(error) {
        reject(error);
      });
    });
  },
};

const FrameUtils = {
  changeDay: function(frame, direction) {
    return new Promise(function(resolve, reject) {
      const pageHeaderInstance = frame.findOne(isPageHeaderInstance);
      if (!pageHeaderInstance) {
        resolve();
        return;
      }

      const dayTitleLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'DayTitle');
      const weekDayNameLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'WeekDayName');

      if (!dayTitleLayer || !weekDayNameLayer) {
        resolve();
        return;
      }

      const fontPromises = [];

      const dayTitleFontName = dayTitleLayer.fontName;
      const dayTitleFontPromise = (dayTitleFontName === figma.mixed)
        ? FontUtils.loadAllFonts()
        : figma.loadFontAsync(dayTitleFontName);
      fontPromises.push(dayTitleFontPromise);

      const weekDayNameFontName = weekDayNameLayer.fontName;
      const weekDayNameFontPromise = (weekDayNameFontName === figma.mixed)
        ? FontUtils.loadAllFonts()
        : figma.loadFontAsync(weekDayNameFontName);
      fontPromises.push(weekDayNameFontPromise);

      Promise.all(fontPromises).then(function() {
        const currentDateStr = dayTitleLayer.characters;
        const currentDate = DateUtils.parseRussianDate(currentDateStr);
        if (!currentDate) {
          resolve();
          return;
        }

        if (direction === 'up') {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        } else if (direction === 'down') {
          currentDate.setUTCDate(currentDate.getUTCDate() - 1);
        }

        (async function() {
          const newDateText = DateUtils.formatDateInRussian(currentDate);
          dayTitleLayer.characters = newDateText;

          const newWeekDayName = DateUtils.getDayOfWeekInRussian(currentDate);
          weekDayNameLayer.characters = newWeekDayName;

          // Now check if week number has changed
          const newWeekNumber = DateUtils.getISOWeekNumber(currentDate);
          const newYear = currentDate.getUTCFullYear();
          const currentWeekNumber = FrameUtils.getWeekNumberFromFrame(frame);

          if (newWeekNumber !== currentWeekNumber) {
            // Week has changed

            // Update WeekNumber layer
            await FrameUtils.setWeekNumberInFrame(frame, newWeekNumber);

            // Update WeekDay[1-7] labels
            const dates = DateUtils.getDatesForWeek(newWeekNumber, newYear);
            const formattedDates = dates.map(function(date) {
              return DateUtils.formatDateInRussian(date);
            });

            const weekDayTextLayers = NodeUtils.findWeekDayTextLayers(frame);
            const weekDayPromises = weekDayTextLayers.map(async (weekDayLayer, index) => {
              if (formattedDates[index]) {
                try {
                  await figma.loadFontAsync(weekDayLayer.fontName);
                  weekDayLayer.characters = formattedDates[index];
                } catch (error) {
                  console.error(`Failed to load font for "${weekDayLayer.name}": ${error.message}`);
                }
              }
            });

            await Promise.all(weekDayPromises);
          }

          await FrameUtils.updateActiveDayOpacity(frame);
          resolve();
        })().catch(function(error) {
          console.error(`Error in changeDay function: ${error.message}`);
          resolve();
        });
      }).catch(function(error) {
        console.error(`Failed to load fonts: ${error.message}`);
        resolve();
      });
    });
  },

  setWeekNumberInFrame: function(frame, newWeekNumber) {
    const weekNumberLayer = NodeUtils.findTextLayer(frame, "WeekNumber");
    if (weekNumberLayer) {
      figma.loadFontAsync(weekNumberLayer.fontName).then(function() {
        const currentText = weekNumberLayer.characters;
        const match = currentText.match(/(\D*)(\d+)(?:\.(\d+))?/);

        if (match) {
          const prefix = match[1] || '';
          const hasSuffix = match[3] !== undefined;
          const suffixNumber = hasSuffix ? 1 : '';
          const updatedText = hasSuffix
            ? `${prefix}${newWeekNumber}.${suffixNumber}`
            : `${prefix}${newWeekNumber}`;
          weekNumberLayer.characters = updatedText;
        } else {
          weekNumberLayer.characters = `W${newWeekNumber}`;
        }
      }).catch(function(error) {
        console.error(`Failed to load font for "WeekNumber" layer: ${error.message}`);
      });
    }
  },

  getWeekNumberFromFrame: function(frame) {
    const weekNumberLayer = NodeUtils.findTextLayer(frame, "WeekNumber");
    if (weekNumberLayer) {
      const match = weekNumberLayer.characters.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    const titleLayer = NodeUtils.findTextLayer(frame, "Title");
    if (titleLayer) {
      const match = titleLayer.characters.match(/W(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return DateUtils.getISOWeekNumber(new Date());
  },

  updateTextLayers: function(frame, frameNumber, incrementPart) {
    return new Promise(function(resolve, reject) {
      (async () => {
        try {
          const weekNumberLayer = NodeUtils.findTextLayer(frame, "WeekNumber");
          let weekInfo = null;

          if (weekNumberLayer) {
            await figma.loadFontAsync(weekNumberLayer.fontName);
            weekInfo = await FrameUtils.updateWeekNumber(weekNumberLayer, incrementPart);
          }

          if (weekInfo !== null) {
            const { weekNumber, year } = weekInfo;
            const dates = DateUtils.getDatesForWeek(weekNumber, year);
            const formattedDates = dates.map(function(date) {
              return DateUtils.formatDateInRussian(date);
            });

            const weekDayTextLayers = NodeUtils.findWeekDayTextLayers(frame);
            const weekDayPromises = weekDayTextLayers.map(async (weekDayLayer, index) => {
              if (formattedDates[index]) {
                try {
                  await figma.loadFontAsync(weekDayLayer.fontName);
                  weekDayLayer.characters = formattedDates[index];
                } catch (error) {
                  console.error(`Failed to load font for "${weekDayLayer.name}": ${error.message}`);
                }
              }
            });

            const contentTextLayers = NodeUtils.findContentTextLayers(frame);
            const contentPromises = contentTextLayers.map(async (contentLayer, index) => {
              if (formattedDates[index]) {
                try {
                  await figma.loadFontAsync(contentLayer.fontName);
                  contentLayer.characters = formattedDates[index];
                } catch (error) {
                  console.error(`Failed to load font for "${contentLayer.name}": ${error.message}`);
                }
              }
            });

            await Promise.all([...weekDayPromises, ...contentPromises]);

            if (incrementPart === 'main') {
              const pageHeaderInstance = frame.findOne(isPageHeaderInstance);
              if (pageHeaderInstance) {
                const dayTitleLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'DayTitle');
                const weekDayNameLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'WeekDayName');

                if (dayTitleLayer) {
                  try {
                    await (dayTitleLayer.fontName === figma.mixed
                      ? FontUtils.loadAllFonts()
                      : figma.loadFontAsync(dayTitleLayer.fontName));
                    const mondayDate = dates[0];
                    const formattedMondayDate = DateUtils.formatDateInRussian(mondayDate);
                    dayTitleLayer.characters = formattedMondayDate;
                  } catch (error) {
                    console.error(`Failed to update "DayTitle" layer: ${error.message}`);
                  }
                }

                if (weekDayNameLayer) {
                  try {
                    await (weekDayNameLayer.fontName === figma.mixed
                      ? FontUtils.loadAllFonts()
                      : figma.loadFontAsync(weekDayNameLayer.fontName));
                    const mondayName = DateUtils.getDayOfWeekInRussian(dates[0]);
                    weekDayNameLayer.characters = mondayName;
                  } catch (error) {
                    console.error(`Failed to update "WeekDayName" layer: ${error.message}`);
                  }
                }

                await FrameUtils.updateActiveDayOpacity(frame);
              }
            }

            const frameNumCopyLayer = NodeUtils.findTextLayer(frame, "FrameNumCopy");
            if (frameNumCopyLayer) {
              try {
                await figma.loadFontAsync(frameNumCopyLayer.fontName);
                frameNumCopyLayer.characters = frame.name;
              } catch (error) {
                console.error(`Failed to load font for "FrameNumCopy" layer: ${error.message}`);
              }
            }

            resolve();
          } else {
            resolve();
          }
        } catch (error) {
          console.error(`Error in updateTextLayers for frame "${frame.name}": ${error.message}`);
          reject(error);
        }
      })();
    });
  },

  updateWeekNumber: function(weekNumberLayer, incrementPart) {
    return new Promise(function(resolve, reject) {
      figma.loadFontAsync(weekNumberLayer.fontName).then(function() {
        const currentText = weekNumberLayer.characters;
        const match = currentText.match(/(\D*)(\d+)(?:\.(\d+))?/);

        if (!match) {
          resolve(null);
          return;
        }

        const prefix = match[1] || 'W';
        let mainWeekNumber = parseInt(match[2], 10);
        const hasSuffix = match[3] !== undefined;
        let suffixWeekNumber = hasSuffix ? parseInt(match[3], 10) : null;

        if (incrementPart === 'main') {
          mainWeekNumber += 1;
          if (hasSuffix) {
            suffixWeekNumber = 1;
          }
        } else if (incrementPart === 'suffix') {
          if (hasSuffix) {
            suffixWeekNumber += 1;
          } else {
            suffixWeekNumber = 1;
          }
        }

        let updatedText;
        if (hasSuffix || incrementPart === 'suffix') {
          updatedText = `${prefix}${mainWeekNumber}.${suffixWeekNumber}`;
        } else {
          updatedText = `${prefix}${mainWeekNumber}`;
        }

        weekNumberLayer.characters = updatedText;

        const year = new Date().getFullYear();
        resolve({ weekNumber: mainWeekNumber, year: year });
      }).catch(function(error) {
        console.error(`Failed to load font for "WeekNumber" layer: ${error.message}`);
        resolve(null);
      });
    });
  },

  updateActiveDayOpacity: function(frame) {
    return new Promise(function(resolve, reject) {
      const pageHeaderInstance = frame.findOne(isPageHeaderInstance);
      if (!pageHeaderInstance) {
        resolve();
        return;
      }

      const dayTitleLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'DayTitle');
      if (!dayTitleLayer) {
        resolve();
        return;
      }

      const currentDateStr = dayTitleLayer.characters;
      const currentDate = DateUtils.parseRussianDate(currentDateStr);
      if (!currentDate) {
        resolve();
        return;
      }

      let dayOfWeek = currentDate.getUTCDay();
      let activeDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const weekDayLayers = frame.findAll(node => node.type === 'TEXT' && /^WeekDay\d+$/.test(node.name));

      weekDayLayers.sort((a, b) => {
        const aNumber = parseInt(a.name.replace('WeekDay', ''), 10);
        const bNumber = parseInt(b.name.replace('WeekDay', ''), 10);
        return aNumber - bNumber;
      });

      for (let i = 0; i < weekDayLayers.length; i++) {
        const layer = weekDayLayers[i];
        if (i === activeDayIndex) {
          layer.opacity = 1;
        } else {
          layer.opacity = 0.2;
        }
      }

      resolve();
    });
  },

  activateNextWeekDay: function(frame) {
    return new Promise(function(resolve, reject) {
      const weekDays = frame.findAll(function(node) {
        return node.type === 'GROUP' && /^Day\d+$/.test(node.name);
      });
      if (weekDays.length === 0) {
        resolve();
        return;
      }

      let activeDayIndex = -1;
      for (let i = 0; i < weekDays.length; i++) {
        if (weekDays[i].opacity === 1) {
          activeDayIndex = i;
          break;
        }
      }
      if (activeDayIndex === -1) {
        activeDayIndex = 0;
      } else {
        activeDayIndex = (activeDayIndex + 1) % weekDays.length;
      }

      for (let i = 0; i < weekDays.length; i++) {
        weekDays[i].opacity = i === activeDayIndex ? 1 : 0.5;
      }

      const activeDate = DateUtils.getDatesForWeek(
        FrameUtils.getWeekNumberFromFrame(frame),
        new Date().getFullYear()
      )[activeDayIndex];
      const formattedDate = DateUtils.formatDateInRussian(activeDate);

      const fontPromises = [];

      const pageHeaderInstance = frame.findOne(isPageHeaderInstance);
      if (pageHeaderInstance) {
        const dayTitleLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'DayTitle');
        const weekDayNameLayer = pageHeaderInstance.findOne(node => node.type === 'TEXT' && node.name === 'WeekDayName');

        if (dayTitleLayer) {
          try {
            (async () => {
              await (dayTitleLayer.fontName === figma.mixed
                ? FontUtils.loadAllFonts()
                : figma.loadFontAsync(dayTitleLayer.fontName));
              const formattedMondayDate = DateUtils.formatDateInRussian(activeDate);
              dayTitleLayer.characters = formattedMondayDate;
              resolve();
            })();
          } catch (error) {
            console.error(`Failed to update "DayTitle" layer: ${error.message}`);
            resolve();
          }
        }

        if (weekDayNameLayer) {
          try {
            (async () => {
              await (weekDayNameLayer.fontName === figma.mixed
                ? FontUtils.loadAllFonts()
                : figma.loadFontAsync(weekDayNameLayer.fontName));
              const dayName = DateUtils.getDayOfWeekInRussian(activeDate);
              weekDayNameLayer.characters = dayName;
              resolve();
            })();
          } catch (error) {
            console.error(`Failed to update "WeekDayName" layer: ${error.message}`);
            resolve();
          }
        }

        resolve();
      } else {
        resolve();
      }
    });
  },
};

const SelectionHandler = {
  updateFrameNumberInUI: function() {
    const selection = figma.currentPage.selection;
    let frameNumber = '';
    if (selection.length > 0 && selection[0].type === 'FRAME') {
      frameNumber = selection[0].name;
    }
    figma.ui.postMessage({ type: 'set-frame-number', frameNumber: frameNumber });
  },
};

function initializePlugin() {
  figma.ui.onmessage = function(msg) {
    switch (msg.type) {
      case 'run-plugin':
        RunPluginHandler.handle(msg);
        break;
      case 'weekday-up':
        WeekdayHandler.handle('up');
        break;
      case 'weekday-down':
        WeekdayHandler.handle('down');
        break;
      case 'get-frame-number':
        SelectionHandler.updateFrameNumberInUI();
        break;
      default:
        break;
    }
  };

  SelectionHandler.updateFrameNumberInUI();
  figma.on('selectionchange', SelectionHandler.updateFrameNumberInUI);
}

const RunPluginHandler = {
  handle: function(msg) {
    FontUtils.loadAllFonts().then(function() {
      if (figma.currentPage.selection.length === 0) {
        console.error('No frame selected.');
        return;
      }

      const selectedFrame = figma.currentPage.selection[0];

      if (selectedFrame.type !== 'FRAME') {
        console.error('Selected item is not a frame.');
        return;
      }

      const position = msg.position;
      const duplicatedFrame = selectedFrame.clone();

      getNextFrameNumber().then(function(nextFrameNumber) {
        const newFrameName = nextFrameNumber.toString().padStart(2, '0');
        duplicatedFrame.name = newFrameName;

        let incrementPart = 'main';
        switch (position) {
          case 'right':
            duplicatedFrame.x += selectedFrame.width + 200;
            incrementPart = 'suffix';
            break;
          case 'down':
            duplicatedFrame.y += selectedFrame.height + 200;
            incrementPart = 'main';
            break;
          case 'right+1day':
            duplicatedFrame.x += selectedFrame.width + 200;
            incrementPart = 'suffix';
            break;
          default:
            console.error(`Unknown duplication position: "${position}"`);
            return;
        }

        let fontPromises = [];

        const numberLayer = NodeUtils.findTextLayer(duplicatedFrame, "Number");
        if (numberLayer) {
          const p = figma.loadFontAsync(numberLayer.fontName).then(function() {
            const currentText = numberLayer.characters;
            const updatedText = incrementString(currentText, incrementPart, false);
            numberLayer.characters = updatedText;
          }).catch(function(error) {
            console.error(`Failed to load font for "Number" layer: ${error.message}`);
          });
          fontPromises.push(p);
        }

        const titleLayer = NodeUtils.findTextLayer(duplicatedFrame, "Title");
        if (titleLayer) {
          const p = figma.loadFontAsync(titleLayer.fontName).then(function() {
            const currentText = titleLayer.characters;
            const updatedText = incrementString(currentText, incrementPart, false);
            titleLayer.characters = updatedText;
          }).catch(function(error) {
            console.error(`Failed to load font for "Title" layer: ${error.message}`);
          });
          fontPromises.push(p);
        }

        Promise.all(fontPromises).then(function() {
          FrameUtils.updateTextLayers(duplicatedFrame, newFrameName, incrementPart).then(function() {
            if (position === 'right+1day') {
              FrameUtils.changeDay(duplicatedFrame, 'up').then(function() {
                figma.currentPage.selection = [duplicatedFrame];
                // Add the operation-complete message here
                figma.ui.postMessage({ type: 'operation-complete' });
              }).catch(function(error) {
                console.error(`Error changing day: ${error.message}`);
                // Also add it here in case of an error
                figma.ui.postMessage({ type: 'operation-complete' });
              });
            } else {
              figma.currentPage.selection = [duplicatedFrame];
              // Add it here for other cases
              figma.ui.postMessage({ type: 'operation-complete' });
            }
          }).catch(function(error) {
            console.error(`Error updating text layers: ${error.message}`);
            // Add it here in case of an error
            figma.ui.postMessage({ type: 'operation-complete' });
          });
        }).catch(function(error) {
          console.error(`Error updating Number and Title layers: ${error.message}`);
          // Add it here in case of an error
          figma.ui.postMessage({ type: 'operation-complete' });
        });
      }).catch(function(error) {
        console.error(`Error getting next frame number: ${error.message}`);
        // Add it here in case of an error
        figma.ui.postMessage({ type: 'operation-complete' });
      });
    }).catch(function(error) {
      console.error(`Error during plugin run: ${error.message}`);
      // Add it here in case of an error
      figma.ui.postMessage({ type: 'operation-complete' });
    });
  },
};

const WeekdayHandler = {
  handle: function(direction) {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      console.error('No frame selected.');
      return;
    }

    const frame = selection[0];
    if (frame.type !== 'FRAME') {
      console.error('Selected item is not a frame.');
      return;
    }

    FrameUtils.changeDay(frame, direction).then(function() {
      // Optional: Handle post-change actions if necessary
    }).catch(function(error) {
      console.error(`Error changing day: ${error.message}`);
    });
  },
};

function incrementString(text, incrementPart, includeSuffix = true) {
  const match = text.match(/(\D*)(\d+)(?:\.(\d+))?/);
  if (!match) {
    return text;
  }

  const prefix = match[1] || '';
  let mainNumber = parseInt(match[2], 10);
  let suffixNumber = match[3] ? parseInt(match[3], 10) : 0;

  if (incrementPart === 'main') {
    mainNumber += 1;
    if (match[3] !== undefined) {
      suffixNumber = 1;
    }
  } else if (incrementPart === 'suffix') {
    if (match[3] !== undefined) {
      suffixNumber += 1;
    } else {
      suffixNumber = 1;
    }
  }

  let incrementedText;
  if (match[3] !== undefined || incrementPart === 'suffix') {
    incrementedText = `${prefix}${mainNumber}.${suffixNumber}`;
  } else {
    incrementedText = `${prefix}${mainNumber}`;
  }
  return incrementedText;
}

function getNextFrameNumber() {
  return new Promise(function(resolve) {
    const frames = figma.currentPage.findAll(function(node) {
      return node.type === 'FRAME';
    });
    const frameNumbers = frames.map(function(frame) {
      return parseInt(frame.name, 10);
    }).filter(function(num) { 
      return !isNaN(num);
    });
    const maxFrameNumber = frameNumbers.length > 0 ? Math.max.apply(null, frameNumbers) : 0;
    resolve(maxFrameNumber + 1);
  });
}

initializePlugin();