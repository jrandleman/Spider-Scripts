// Author: Jordan Randleman - HTML Link Parsing Algorithm.

/* 
 * Given an HTML page & its URL, returns a URL object of HTML's sorted
 * embedded links. I haven't implemented the http request functionality 
 * locally, to allow for flexibility on the user's end with respect to: 
 * (A) their preffered means of conducting http requests
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
exports.parser = (html, siteUrl) => {
  let urls = getSiteUrlExtensions(siteUrl);
  // W/o last filepath,  with last filepath.
  let rootUrl = urls[0], lastFileUrl = urls[1];
  let linkPrefixes = ['src="', 'href="'];
  var links = {};
  for(let prefix of linkPrefixes) { // For each link prefix.
    let prefixSize = prefix.length;
    let start = 0;
    while(true) { // While still links with prefix to scraped.
      start = html.indexOf(prefix, start) + prefixSize;
      let linkType = getLinkHtmlType(start, html);
      if(start - prefixSize === -1) break; // No more links with prefix.
      let link = html.slice(start, html.indexOf('"', start));
      if(link.slice(0,2) == '//') link = 'https:' + link;
      if(link.slice(0, 4) != 'http') { // Extends current url.
        let linkHead = (link[0] == '/') ? rootUrl : lastFileUrl;
        link = linkHead + ((linkHead[linkHead.length - 1] != '/') ? '/' + link : link); 
      }
      if(linkType == null) { // Couldn't find tag/rel/type for link.
        let linkExtension = getLinkExtension(link);
        linkType = getLinkExtensionType(linkExtension);
      }
      if(links[linkType] == undefined) links[linkType] = [];
      if(links[linkType].indexOf(link) === -1) links[linkType].push(formattedLink(link));
    }
  }
  if(Object.keys(links).length === 0) return null;
  return links;
}

/******************************************************************************/
// EXTENSION FUNCTIONS
/******************************************************************************/

// Returns base/full site urls w/o & w/ last filename extension.
function getSiteUrlExtensions(siteUrl) {
  var lastFileName = '';
  let firstSlashIdx = siteUrl.indexOf('/', 9); // After 'https://'
  var pageIdx = siteUrl.lastIndexOf('/'), lastFileIdx = siteUrl.length;
  if(pageIdx != 6 && pageIdx != 7 && pageIdx != -1) { // Not 'http://' nor 'https://'
    lastFileIdx = siteUrl.lastIndexOf('/', pageIdx - 1);
    if(lastFileIdx != -1) lastFileName = siteUrl.slice(lastFileIdx, pageIdx + 1);
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
    let dotIdx = link.lastIndexOf('.', qMarkLastIdx);
    let slashIdx = link.lastIndexOf('/', qMarkLastIdx);
    let idx = (dotIdx > slashIdx) ? dotIdx : slashIdx;
    if(idx != -1 && idx >= qMarkLastIdx - 7) { // Valid embedded extension. 7 = longest extnsn.
      fileExtension = link.slice(idx, qMarkLastIdx).replace(/\./g, '');
    }
  }
  return fileExtension;
}

// Returns link extension's file type.
function getLinkExtensionType(extension) {
  let fileTypeSections = Object.keys(FILE_EXTENSIONS);
  for(let fileType of fileTypeSections) {
    let fileTypeObj = FILE_EXTENSIONS[fileType];
    let fileTypeNames = Object.keys(fileTypeObj);
    for(let typeName of fileTypeNames) {
      if(fileTypeObj[typeName].indexOf(extension) != -1) return typeName;
    }
  }
  return 'other';
}

/******************************************************************************/
// HELPER FUNCTIONS
/******************************************************************************/

// Returns link's type based off of tag/rel/type, if exists.
function getLinkHtmlType(start, html) {
  // Check link's <tag>.
  let tagStartIdx = html.lastIndexOf('<', start) + 1;
  if(tagStartIdx == 0) return null;
  let tagPrefix = html.slice(tagStartIdx, html.indexOf(' ', tagStartIdx));
  if(tagPrefix == 'script' || tagPrefix == 'img') return tagPrefix;
  // Check link's 'rel' attribute.
  let tagEndIdx = html.indexOf('>', start);
  let relIdx = html.indexOf('rel="', start) + 5;
  if(relIdx != 4 && relIdx < tagEndIdx) {
    let relStr = html.slice(relIdx, 14);
    if(relStr.includes('stylesheet'))    return 'style';
    if(relStr.includes('shortcut icon')) return 'img';
  }
  // Check link's 'type' attribute.
  let typeIdx = html.indexOf('type="', start) + 6;
  if(typeIdx != 5 && typeIdx < tagEndIdx) {
    let relStr = html.slice(typeIdx, 14);
    if(relStr.includes('text/css'))     return 'style';
    if(relStr.includes('image/x-icon')) return 'img';
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
