# parseLinksJs
## _Parse &amp; Categorize Embedded Webpage Links!_</br>
### Returns an object with a webpage's categorized embedded links, or null if none detected.

__Downloads:__
* parseLinks.js is ready for download as is, requiring no external libraries.
* To test parseLinks.js with parseLinksSampleExec.js, make sure you have [npm request](https://www.npmjs.com/package/request) installed

__Usage:__
* Begin programs making requests & using the link parser with this dependancy:
  - const linkParser = require('\<filepath\>/parseLinks').Parser; 
* Once you've downloaded a URL's html page, call the function:
  - var linksObject = linkParser(html, url);
