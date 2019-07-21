// Author: Jordan Randleman - Google Query Coordinates Parsing Script

/* 
 * Given an array of locations, submits a Google query for each & returns a promised
 * JSON array of location objects with each name, latitude & longitude coordinates,
 * & any errors thrown in the parsing process. Uses Puppeteer.
 */

const puppeteer = require('puppeteer');

/******************************************************************************/
// MAIN QUERY FUNCTIONS
/******************************************************************************/

// Location structure for objects in JSON array.
class Location {
  constructor(locationName) {
    this.locationName = locationName;
    this.lat = null, this.lng = null;
    this.err = null;
  }
}

// Given locations array, resolves w/ JSON of location names, coords, & any
// errors, or rejects with a fatal error.
exports.Parser = function parseLocationCoords(locations) {
  return new Promise(async(resolve, reject) => {
    try {
      const coordsSelector = 'div[data-attrid="kc:/location/location:coordinates"]';
      const searchSelector = 'input[title="Search"]';
      const locationsLength = locations.length;
      // Validate locations array, then load chromium & google via puppeteer.
      if(locationsLength === 0) throw 'Empty "locations" array passed as argument!';
      var browser = await puppeteer.launch({ headless: true });
      var page = await browser.newPage();
      await page.goto('https://www.google.com/');
      await page.waitForSelector(searchSelector);
      // Enter the first location's query & load the next page.
      var searchQuery = locations[0] + ' lat long';
      await page.type(searchSelector, searchQuery);
      page.keyboard.press('Enter');
      await page.waitForNavigation(); 
      // Scrape Lat/Lng (if present) per location via the search bar on the current page.
      var locationsJSON = [];
      for(let i = 0; i < locationsLength; ++i) {
        var location = new Location(locations[i]), foundCoords = true;
        var noCoords = `'${searchQuery}': Google query didn't return any Lat/Lng coordinates.`;
        try { 
          await page.waitForSelector(coordsSelector, { timeout: 1250 });
          var coordStr = await page.$eval(coordsSelector, e => e.innerText);
          var coords = parseCoordinatesString(coordStr);
        } catch(err) {
          locationsJSON.push({...location, "err": noCoords});
          foundCoords = false;
        }
        if(foundCoords && !coords[0]) {
          locationsJSON.push({...location, "err": coords[1]});
        } else if(foundCoords) {
          locationsJSON.push({...location, "lat": coords[0], "lng": coords[1]});
        }
        // Enter the next location in the search bar on the current page.
        if(i < locationsLength - 1) {
          searchQuery = locations[i + 1] + ' lat long';
          await page.click(searchSelector, { clickCount: 3 });
          await page.type(searchSelector, searchQuery);
          page.keyboard.press('Enter');
          await page.waitForNavigation(); 
        }
      }
      // Wait for browser activity to end before closing.
      await page.waitFor(250);
      await browser.close();
      return resolve(locationsJSON);
    } catch (err) {
      await page.waitFor(250);
      await browser.close();
      return reject('parseCoords.js rejected with a Fatal Error: ' + err);
    }
  });
}

/******************************************************************************/
// HELPER COORDINATE-PARSING FUNCTION
/******************************************************************************/

// Given a string with lat/lng coords, returns them as parsed floats.
function parseCoordinatesString(coordStr) {
  var coordErr = (err) => `Invalid Google geocoordinate ${err}!\n=> Find a more consistent selector type!`;
  let hasCardinals = 'NSEW'.split('').map(e => coordStr.indexOf(e)).filter(e => e != -1);
  let degree1 = coordStr.indexOf('°'), degree2 = coordStr.lastIndexOf('°');
  if(hasCardinals.length != 2 || degree1 === degree2) {
    return [null, coordErr((hasCardinals.length != 2) ? 'cardinality' : 'degree character')];
  }
  var lat = parseFloat(coordStr.slice(0, degree1));
  var lng = parseFloat(coordStr.slice(coordStr.indexOf(', ') + 2, degree2));
  if(coordStr[hasCardinals[0]] === 'S') lat *= -1;
  if(coordStr[hasCardinals[1]] === 'W') lng *= -1;
  return [lat, lng];
}
