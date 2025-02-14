/**
 * This module measures advertisement info on news pages
 *
 * Brian Chivers, 3/19/2021
 * @module WebScience.Measurements.Advertisements
 */

 import * as webScience from "@mozilla/web-science";
 
let initialized = false


/**
 * Start an advertisements study.
 * @param {Object} options - A set of options for the study.
 * @param {string[]} [options.domains=[]] - The domains of interest for the study.
 * @param {Object} rally - The Mozilla Rally object for this study, initialized in background.js
 * @param {Boolean} is_dev_mode - Changes storage location based on whether this is dev mode or not
 */
export async function startMeasurement ({
  domains = [],
  rally: rally,
  is_dev_mode: is_dev_mode
}) {
  // If this module has already been initialized, don't do it again
  if (initialized) {
    return
  }
  initialized = true
  // Make sure the page manager has initialized.  This is used for the PageID
  await webScience.pageManager.initialize();

  // Build the URL matching set for content scripts
  const contentScriptMatches = webScience.matching.domainsToMatchPatterns(domains, true);

  // Register the content script for measuring advertisement info
  // The CSS selectors file is needed to find ads on the page
  await chrome.contentScripts.register ({
    matches: contentScriptMatches,
    js: [
      {
        file: "/dist/content-scripts/page-ads.js"
      }
      ],
    runAt: "document_start"
  })

  // Handle advertisement callbacks
  webScience.messaging.onMessage.addListener( async (adInfo, sender, sendResponse) => {
    const surveyUserID = await webScience.userSurvey.getSurveyId()
    const output = {
      "type" : "WebScience.advertisements",
      "userId" : ""+surveyUserID,
      "visitId" : adInfo.pageId,
      "url" : webScience.matching.normalizeUrl(sender.url),
      "body" : adInfo.body,
      "ads" : adInfo.ads
    }
    if (is_dev_mode){
      // pageID is a unique ID for the browser key/value storage
      const pageId = "WebScience.Advertisements."+adInfo.pageId
      console.log({[pageId]:output})
    } else {
      rally.sendPing("advertisement", output);
    }
  }, {
    type: "WebScience.advertisements",
    schema:{
      pageId:"string",
      type: "string",
      url: "string",
      ads: "object",
      body: "object"
  }
  }
  )
}

