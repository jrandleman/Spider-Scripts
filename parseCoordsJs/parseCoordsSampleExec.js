// Author: Jordan Randleman - Sample Google Query Coordinates Parsing Execution

const coordsParser = require('./parseCoords').Parser;

/******************************************************************************/
// SAMPLE MAIN EXECUTION OF THE COORDINATE PARSER VIA GOOGLE-QUERIES
/******************************************************************************/

// Sample coordinate scraping function execution.
function sampleCoordsQueryExec(locations) {
  let coordsPromise = coordsParser(locations);
  coordsPromise.then((coordsJSON) => {
    console.log(coordsJSON);
  }).catch((err) => {
    console.error(err);
  });
}

const locations = [
  'brasilia', 'paris', 'san francisco', 'brussels', 'beijing', 'tokyo', 'cape town', 
  'canberra', 'mexico city', 'ottawa', 'costa rica', 'santiago', 'warsaw', 'moscow'
];

sampleCoordsQueryExec(locations);
