# parseCoordsJs
## _Parse & Create JSON Array of Location Geocoordinates!_</br>
### Returns JSON object array promise of location names, DD coordinates, & any error messages.

__Downloads:__
* To run `parseCoords.js`, make sure you have [npm puppeteer](https://www.npmjs.com/package/puppeteer) installed.
* Testing `parseCoords.js` with `parseCoordsSampleExec.js` requires no external libraries.

__Usage:__</br>
Begin programs with the array of location names that calls the coordinate parser with this dependancy:
```javascript
const coordsParser = require('<filepath>/parseCoords').Parser;
```
Call the function & operate on the returned JSON once the promise resolves:
```javascript
const locations = ['brasilia', 'paris', 'san francisco', 'brussels', 'beijing', 'tokyo'];
var coordsPromise = coordsParser(locations);
coordsPromise.then((coordsJSON) => {
  // Your code here
});
```
