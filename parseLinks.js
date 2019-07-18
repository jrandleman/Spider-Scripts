// Author: Jordan Randleman - HTML Link Parsing Algorithm.

/* 
 * Given an HTML page & its URL, returns a URL object of HTML's sorted
 * embedded links. I haven't implemented the http request functionality 
 * locally, to allow for flexibility on the user's end with respect to: 
 * (A) their preferred means of conducting http requests
 * (B) keeping this code lightweight by leaving out library requirements.
 */

/******************************************************************************/
// GLOBAL FILE EXTENSION TYPES OBJECT
/******************************************************************************/

// See: https://www.computerhope.com/issues/ch001789.htm
const FILE_EXTENSIONS = 
{
  'media': {
    'disk':  ['dmg','iso','toast','vcd',], 
    'audio': ['aif','cda','mid','midi','mp3','mpa','ogg','wav','wma','wpl',],
  },
  'server': {
    'compressed':  ['7z','arj','deb','pkg','rar','rpm','gz','z','zip',],
    'executable':  ['apk','bat','bin','exe','gadget','jar','wsf',],
    'system':      ['bak','cab','cfg','cpl','cur','dll','dmp','drv','icns','ini','lnk','msi','sys','tmp',],
    'database':    ['csv','dat','db','dbf','log','mdb','sav','sql','tar','xml',],
    'programming': ['c','class','cpp','cs','h','java','sh','swift','vb',],
  },
  'internet': {
    'webpage': ['asp','aspx','cer','cfm','html','htm','jsp','part','php','rss','xhtml',], 
    'script':  ['js','json','cgi','pl','py',], 
    'style':   ['css',], 
  },
  'graphics': {
    'font':  ['fnt','fon','otf','ttf',],
    'img':   ['ai','bmp','gif','ico','jpeg','jpg','png','ps','psd','svg','tif','tiff',],
    'video': ['3g2','3gp','avi','flv','h264','m4v','mkv','mov','mp4','mpg','mpeg','rm','swf','vob','wmv',],
  }, 
  'display': {
    'presentation': ['key','odp','pps','ppt','pptx',],
    'spreadsheet':  ['ods','xlr','xls','xlsx',],
    'text':         ['doc','docx','odt','pdf','rtf','tex','txt','wks','wps','wpd',],
  },
};

/******************************************************************************/
// MAIN FUNCTIONS
/******************************************************************************/

// Returns an object of external urls within html from siteUrl.
exports.Parser = (html, siteUrl) => {
  let urls = getSiteUrlExtensions(siteUrl);
  // W/o last filepath,  with last filepath.
  let rootUrl = urls[0], lastFileUrl = urls[1];
  let linkPrefixes = ['src="', 'SRC="', 'href="', 'HREF="'];
  var links = {};
  for(let prefix of linkPrefixes) { // For each link prefix.
    let start = 0, prefixSize = prefix.length;
    while(true) { // While still links with prefix to scraped.
      start = html.indexOf(prefix, start) + prefixSize;
      if(start - prefixSize === -1) break; // No more links with prefix.
      if(html[start] == '"' || html[start+1] == '"') continue; // Empty url.
      let linkType = getLinkHtmlType(start, html);
      let link = html.slice(start, html.indexOf('"', start));
      if(link.slice(0,2) == '//') link = 'https:' + link;
      if(link.slice(0, 4) != 'http') { // Extends current url.
        let header = (link[0] == '/') ? rootUrl : (link[0] == '#') ? siteUrl : lastFileUrl;
        link = header + ((header[header.length-1] != '/' && link[0] != '#') ? '/' + link : link);
      }
      link = formattedLink(link);
      if(!linkType) { // Couldn't find tag/rel/type for link.
        let linkExtension = getLinkExtension(link);
        linkType = getLinkExtensionType(siteUrl, link, linkExtension);
      }
      if(!links[linkType]) links[linkType] = [];
      if(links[linkType].indexOf(link) === -1) links[linkType].push(link);
    }
  }
  if(Object.keys(links).length === 0) return null;
  return sortedLinks(links);
}

/******************************************************************************/
// EXTENSION FUNCTIONS
/******************************************************************************/

// Returns base/full site urls w/o & w/ last filename extension.
function getSiteUrlExtensions(siteUrl) {
  let firstSlashIdx = siteUrl.indexOf('/', 9); // After 'https://'
  var pageIdx = siteUrl.lastIndexOf('/'), lastFileIdx = siteUrl.length;
  if(pageIdx != 6 && pageIdx != 7 && pageIdx != -1) { // Not 'http://' nor 'https://'
    lastFileIdx = siteUrl.lastIndexOf('/', pageIdx - 1);
    var lastFileName = (lastFileIdx != -1) ? siteUrl.slice(lastFileIdx, pageIdx + 1) : '';
  }
  var baseUrl = (lastFileIdx != -1) ? siteUrl.slice(0, lastFileIdx) : siteUrl;
  var rootUrl = (firstSlashIdx != -1) ? siteUrl.slice(0, firstSlashIdx) : siteUrl;
  return [rootUrl, baseUrl + lastFileName];
}

// Returns a link's file extension.
function getLinkExtension(link) { // Either at the end, or embedded w/in pre-'?'
  var fileExtension = link.slice(link.lastIndexOf('.') + 1);
  let qMarkLastIdx = link.lastIndexOf('?');
  if(qMarkLastIdx == link.indexOf('?') && qMarkLastIdx != -1) { // Embedded extension.
    let idx = Math.max(link.lastIndexOf('.', qMarkLastIdx), link.lastIndexOf('/', qMarkLastIdx));
    if(idx != -1 && idx >= qMarkLastIdx - 7) { // Valid embedded extension. 7 = longest extnsn.
      fileExtension = link.slice(idx, qMarkLastIdx).replace(/\./g, '');
    }
  }
  return fileExtension;
}

// Returns link extension's file type.
function getLinkExtensionType(siteUrl, link, extension) {
  for(let type in FILE_EXTENSIONS) {
    for(let subtype in FILE_EXTENSIONS[type]) {
      if(FILE_EXTENSIONS[type][subtype].indexOf(extension) != -1) return subtype;
    }
  }
  if(link.includes(siteUrl)) return 'extendsUrl';
  return 'other';
}

/******************************************************************************/
// HELPER FUNCTIONS
/******************************************************************************/

// Returns link's type based off of tag/rel/type, if exists.
function getLinkHtmlType(start, html) {
  var linkTag = getLinkTag(start, html);
  if(linkTag) return linkTag;
  var relAttrib = getLinkAttribute(start, html, 'rel="', 'stylesheet', 'shortcut icon');
  if(relAttrib) return relAttrib;
  var typeAttrib = getLinkAttribute(start, html, 'type="', 'text/css', 'image/x-icon');
  return typeAttrib;
}

// Returns link's <tag>.
function getLinkTag(start, html) {
  let tagStartIdx = html.lastIndexOf('<', start) + 1;
  let tagEndIdx = html.lastIndexOf('>', start) + 1;
  if(tagStartIdx != 0 && tagStartIdx > tagEndIdx) {
    let tagPrefix = html.slice(tagStartIdx, html.indexOf(' ', tagStartIdx));
    if(tagPrefix == 'script' || tagPrefix == 'img') return tagPrefix;
  }
  return null;
}

// Returns link's 'rel' or 'type' attribute.
function getLinkAttribute(start, html, attrib, css, img) {
  let attribIdx = html.indexOf(attrib, start) + attrib.length;
  let tagEndIdx = html.indexOf('>', start);
  if(attribIdx != attrib.length - 1 && attribIdx < tagEndIdx) {
    let attribStr = html.slice(attribIdx, 14);
    if(attribStr.includes(css)) return 'style';
    if(attribStr.includes(img)) return 'img';
  }
  return null;
}

// Converts '//' => '/' & '&amp;' => '&' w/in a link (except http/https) & rmvs void(0).
function formattedLink(link) {
  let headIdx = link.indexOf('//') + 2;
  let httpHead = link.slice(0, headIdx);
  let linkTail = link.slice(headIdx).replace(/\/\//g, '/')
                     .replace(/&amp;/g, '&').replace('javascript:void(0);', '');
  return httpHead + linkTail;
}

/******************************************************************************/
// LINK SORTING FUNCTIONS
/******************************************************************************/

// Returns an array of defined file extensions from 'FILE_EXTENSIONS'.
function getDefinedExtensions() {
  var definedExtensions = [];
  for(let type in FILE_EXTENSIONS) {
    for(let subtype in FILE_EXTENSIONS[type]) {
      definedExtensions.push(...FILE_EXTENSIONS[type][subtype]);
    }
  }
  return definedExtensions;
}

// Sorts an object's keys and their value arrays, & puts 'extendsUrl' & 'other' 
// link-types at the end of the object.
function sortKeyValueArrays(obj, sortValues) {
  if(sortValues) for(let key in obj) obj[key] = obj[key].sort();
  var sortedObj = {};
  Object.keys(obj).sort().forEach((sequentialKey) => {
    if(sequentialKey == 'other' || sequentialKey == 'extendsUrl') return;
    sortedObj[sequentialKey] = obj[sequentialKey];
  });
  if(obj['extendsUrl']) sortedObj['extendsUrl'] = obj['extendsUrl'];
  if(obj['other']) sortedObj['other'] = obj['other'];
  return sortedObj;
}

// Create sorted extension-subtype objects within each link-type 'links' key.
function sortedLinks(links) {
  let definedExtensions = getDefinedExtensions();
  for(let linkType in links) {
    var type = {};
    for(let link of links[linkType]) {
      let extension = getLinkExtension(link);
      if(definedExtensions.indexOf(extension) === -1) extension = 'other';
      if(!type[extension]) type[extension] = [];
      type[extension].push(link);
    }
    let names = Object.keys(type);
    type = (names.length === 1) ? type[names[0]] : sortKeyValueArrays(type, true);
    links[linkType] = type;
  }
  return sortKeyValueArrays(links, false);
}
