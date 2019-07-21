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

// Given array of locations, returns JSON w/ location names, coords, & any errs.
exports.Parser = function getCoordsJsonPromise(locations) {
  var promiseArray = [];
  for(let i = 0, locLength = locations.length; i < locLength; ++i) {
    promiseArray.push(parseLocationCoords(locations[i]));
  }
  return Promise.all(promiseArray);
}

// Given a location, resolves w/ an object of location name, coordinates, & err.
async function parseLocationCoords(locationName) {
  try {
    var location = new Location(locationName);
    var searchQuery = locationName + ' lat long';
    var browser = await puppeteer.launch({ headless: true });
    var page = await browser.newPage();
    // Load Google's home page.
    await page.goto('https://www.google.com/');
    await page.waitForSelector('input[title="Search"]');
    // Enter the query & load the next page.
    await page.type('input[title="Search"]', searchQuery, {delay: 5});
    page.keyboard.press('Enter');
    await page.waitForNavigation(); 
    // Scrape Lat Lng string (if exists).
    const coordsSelector = 'div[data-attrid="kc:/location/location:coordinates"]';
    try {
      await page.waitForSelector(coordsSelector, { timeout: 1000 });
      var coordStr = await page.$eval(coordsSelector, e => e.innerText);
    } catch(err) {
      throw `"${searchQuery}": Google query didn't return any Lat/Lng coordinates.`;
    }
    var coordArr = parseCoordinatesString(coordStr);
    if(!coordArr[0]) throw coordArr[1];
    // Wait for browser activity to end before closing.
    await page.waitFor(250);
    await browser.close();
    return Promise.resolve({...location, "lat": coordArr[0], "lng": coordArr[1]});
  } catch (err) {
    await page.waitFor(250);
    await browser.close();
    return Promise.resolve({...location, "err": err});
  }
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
