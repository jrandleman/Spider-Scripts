// Author: Jordan Randleman - Webpage Link Parsing Algorithm.

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
  let linkPrefixes = ['src=', 'SRC=', 'href=', 'HREF=', 'http'];
  var links = {};
  for(let prefix of linkPrefixes) { // For each link prefix.
    let start = 0, prefixSize = (prefix === 'http') ? 1 : prefix.length + 1;
    while(true) { // While still links with prefix to scraped.
      start = html.indexOf(prefix, start) + prefixSize;
      if(start - prefixSize === -1) break; // No more links with prefix.
      if(invalidLink(html, start, prefix)) continue;
      let linkType = getLinkHtmlType(html, start, prefix);
      let link = getLink(html, start, prefix, siteUrl);
      if(!link) continue;
      if(!linkType) { // Couldn't find tag/rel/type for link.
        linkType = getLinkExtensionType(siteUrl, link, getLinkExtension(link));
      }
      if(!links[linkType]) links[linkType] = [];
      if(uniqueLink(link, links[linkType])) links[linkType].push(link);
    }
  }
  if(Object.keys(links).length === 0) return null;
  return sortedLinks(links);
}

/******************************************************************************/
// LINK ANALYSIS FUNCTIONS
/******************************************************************************/

// Returns html's next link at the start index.
function getLink(html, start, prefix, siteUrl) {
  let urls = getSiteUrlExtensions(siteUrl);
  let rootUrl = urls[0], lastDirUrl = urls[1]; // Home page & the last directory.
  let link = getNewlineWrappedLink(html, start, prefix);
  if(!link) link = html.slice(start, endOfLink(html, start)).replace(/\\\//g, '/');
  link = decodedLink(prefix, link, html[start - 1] + link);
  if(link.slice(0,2) == '//') link = 'https:' + link;
  if(link.slice(0, 4) != 'http') { // Extends current url.
    let header = (link[0] == '/') ? rootUrl : (link[0] == '#') ? siteUrl : lastDirUrl;
    link = header + ((header[header.length-1] != '/' && link[0] != '#') ? '/' + link : link);
  }
  link = formattedLink(link);
  if(!link.includes('//') || link.indexOf('.') === -1 || 
    '.='.includes(link[link.length-1]) || link.includes('/../')) {
    return null; // Bad link detected: likely from scraping from JS-construction instructions.
  }
  return link;
}

// Returns link's type based off of tag/rel/type, if exists.
function getLinkHtmlType(html, start, prefix) {
  if(prefix === 'http') return null; // Nested link: type derived by extension.
  let tags = [html, start, '<', 'style', 'img'];
  let rels = [html, start, 'rel=', 'stylesheet', 'shortcut icon'];
  let types = [html, start, 'type=', 'text/css', 'image/x-icon'];
  var tagAttrib = getLinkAttrib(...tags,(str,e1,e2)=>str.lastIndexOf(e1,e2),(n1,n2)=>n1>n2);
  if(tagAttrib) return tagAttrib;
  var relAttrib = getLinkAttrib(...rels,(str,e1,e2)=>str.indexOf(e1,e2),(n1,n2)=>n1<n2);
  if(relAttrib) return relAttrib;
  return getLinkAttrib(...types,(str,e1,e2)=>str.indexOf(e1,e2),(n1,n2)=>n1<n2);
}

// Returns link's <tag>, 'rel', or 'type' attribute.
function getLinkAttrib(html, start, attrib, css, img, indexFcn, validAttrib) {
  let attribLength = (attrib === '<') ? 1 : attrib.length + 1;
  let tagStartIdx = (attrib === '<') ? start : html.lastIndexOf('<', start);
  let attribIdx = indexFcn(html, attrib, tagStartIdx) + attribLength;
  let tagEndIdx = indexFcn(html, '>', start);
  if(attribIdx != attribLength - 1 && validAttrib(attribIdx, tagEndIdx)) {
    let attribStr = html.slice(attribIdx, endOfLink(html, attribIdx));
    if(attribStr == css) return 'style';
    if(attribStr == img || attribStr + ' icon' == img) return 'img';
  }
  return null;
}

/******************************************************************************/
// EXTENSION FUNCTIONS
/******************************************************************************/

// Returns base/full site urls w/o & w/ last directory extension.
function getSiteUrlExtensions(siteUrl) {
  let firstSlashIdx = siteUrl.indexOf('/', 9); // After 'https://'.
  let lastSlashIdx = siteUrl.lastIndexOf('/') + 1;
  var lastDirUrl = (lastSlashIdx > 6) ? siteUrl.slice(0, lastSlashIdx) : siteUrl;
  var rootUrl = (firstSlashIdx != -1) ? siteUrl.slice(0, firstSlashIdx) : siteUrl;
  return [rootUrl, lastDirUrl];
}

// Returns a link's extension.
function getLinkExtension(link) { // Either at the end, or embedded w/in pre-'?'
  var linkExtension = link.slice(link.lastIndexOf('.') + 1);
  let qMarkLastIdx = link.lastIndexOf('?');
  if(qMarkLastIdx == link.indexOf('?') && qMarkLastIdx != -1) { // Embedded extension.
    let idx = Math.max(link.lastIndexOf('.', qMarkLastIdx), link.lastIndexOf('/', qMarkLastIdx)) + 1;
    if(idx != 0 && idx >= qMarkLastIdx - 6) { // Valid embedded extension. 6 = longest extnsn.
      linkExtension = link.slice(idx, qMarkLastIdx);
    }
  }
  return linkExtension;
}

// Returns link extension's file type.
function getLinkExtensionType(siteUrl, link, extension) {
  for(let type in FILE_EXTENSIONS) {
    for(let subtype in FILE_EXTENSIONS[type]) {
      if(FILE_EXTENSIONS[type][subtype].indexOf(extension) != -1) return subtype;
    }
  }
  return (link.indexOf(siteUrl) === 0) ? 'extendsUrl' : 'other';
}

/******************************************************************************/
// HELPER FUNCTIONS
/******************************************************************************/

// Converts '//' => '/', '&amp;' => '&', rmvs void(0) in a link.
function formattedLink(link) {
  return link.replace(/\/\//g, '/').replace(/:\//g, '://')
             .replace(/&amp;/g, '&').replace('javascript:void(0);', '');
}

// Returns a decoded-uri-ified link.
function decodedLink(prefix, link, httpLink) {
  if(prefix === 'http') link = httpLink;
  if(prefix != 'http' || (link && link[4] && 's:%'.indexOf(link[4]) !== -1)) {
    try { link = decodeURIComponent(link).replace(/\\\//g, '/'); } catch(err) {}
  }
  return link;
}

// Returns the index of the end of the link at the 'start' index.
function endOfLink(html, start) {
  let linkEndings = ['"', ' ', '&quot;', '<', '\\', '\''];
  let idxs = linkEndings.map(e => html.indexOf(e, start)).filter(e => e >= 0);
  return Math.min(...idxs);
}

// Returns true if link's empty, or non-nested while searching for js-nested links.
function invalidLink(html, start, prefix) {
  if(prefix === 'http') {
    let linkPrefix = html.slice(start - 7, start - 1).toLowerCase();
    return linkPrefix.includes('href="') || linkPrefix.includes('src="');
  }
  let invalidFirstChar = html[start-1] != '\'' && html[start-1] != '"';
  let emptyLinkString = [html[start], html[start+1]].map(e => (e == '"' || e == '\''));
  let invalidLinkFlags = [invalidFirstChar, ...emptyLinkString].filter(e => e);
  return invalidLinkFlags.length > 0;
}

// Confirms newLink is unique in linkType group.
function uniqueLink(newLink, linkType) {
  if(linkType.indexOf(newLink) != -1) return false;
  for(let link of linkType) {
    if(link == newLink + '/' || newLink == link + '/') return false;
  }
  return true;
}

// Returns newline wrapped link, or null if DNE. Occurs in HTML-generating JS functions.
// EXAMPLE: ... href="+\n"'https://github.com/jrandleman' ...
function getNewlineWrappedLink(html, start, prefix) {
  if(prefix != 'http' && (html.slice(start, start + 2) == ' +' || html[start] == '+')) {
    // Index of next line's quote char & the 2nd inner quote char ending link.
    let nextLineChar = html.indexOf(html[start - 1], start); // EXAMPLE: "
    let nextLineEnd = html.indexOf(html[nextLineChar + 1], nextLineChar + 2); // EXAMPLE: '
    return html.slice(nextLineChar + 2, nextLineEnd).replace(/\\\//g, '/');
  }
  return null;
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
