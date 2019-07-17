// Author: Jordan Randleman - Sample HTML Link Parser Execution

const request = require('request');
const linkParser = require('./parseLinks').Parser;

/******************************************************************************/
// SAMPLE MAIN EXECUTION OF THE HTML LINK PARSER
/******************************************************************************/

// Given a URL, returns a promised object of its embedded links, if any present.
function requestSite(siteUrl) {
  return new Promise((resolve, reject) => {
    request(siteUrl, (err, res, html) => {
      if (err || res.statusCode != 200 || !html) {
        return reject(`err retrieving data: ${err}`);
      }
      let links = linkParser(html, siteUrl);
      if(!links) return reject(`No external links from: ${siteUrl}`);
      return resolve(links);
    });
  });
}

// Executes page request.
function linkParserExec() {
  var siteUrl = 'https://github.com/jrandleman';
  requestSite(siteUrl).then((links) => {
    console.log(links);
  }).catch((err) => {
    console.log(err);
  });
}

linkParserExec();
