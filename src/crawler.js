const cheerio = require('cheerio');
const request = require('request');
const URL = require('url-parse');
const readline = require('readline'); // For user prompt to allow predictions

// Add reading user input:
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask user for URL and keyword
rl.question('Please enter the URL you want to visit: ', (answerUrl) => {
  rl.question('Please enter the keyword you want to search for: ', (answerKeyword) => {
    const inputUrl = answerUrl || 'http://www.arstechnica.com/';
    const checkedUrl = (inputUrl.indexOf('http') != -1 || inputUrl.indexOf('https') != -1) ? inputUrl : 'http://' + inputUrl;
    const startUrl = checkedUrl;
    const maxPagesToVisit = 10;
    const websiteKeyword = answerKeyword || 'alex';

    let numPagesVisited = 0;
    let pagesToVisit = [];
    let pagesVisited = {};
    let url = new URL(startUrl);
    let baseUrl = url.protocol + '//' + url.hostname;

    // Search for word
    const searchForWord = ($, word) => {
      let bodyText = $('html > body').text().toLowerCase();

      return(bodyText.indexOf(word.toLowerCase()) !== -1);
    };

    // Collect links on the website
    const collectInternalLinks = ($) => {
      let allAbsoluteLinks = [];
      let allRelativeLinks = [];

      const relativeLinks = $('a[href^=\'/\']');

      relativeLinks.each(function() {
        allRelativeLinks.push($(this).attr('href'));

        pagesToVisit.push(baseUrl + $(this).attr('href'));
      });

      const absoluteLinks = $('a[href^=\'http\']') || $('a[href^=\'https\']');

      absoluteLinks.each(function() {
        allAbsoluteLinks.push($(this).attr('href'));
      });

      console.log(`Found: ${allAbsoluteLinks.length} absolute links`);
      console.log(`Found: ${allRelativeLinks.length} relative links`);
    };


    // Visit and fetch the website
    const visitPage = (url, callback) => {
      // Add page to our set
      pagesVisited[url] = true;
      numPagesVisited++;

      // Make the request
      console.log(`Visiting page ${url}`);
      request(url, (error, response, body) => {
        // Check status code (200 is HTTP OK)
        console.log(`Status code: ${response.statusCode}`);
        if(response.statusCode !== 200) {
          callback();

          return;
        }

        // Parse the document body
        const $ = cheerio.load(body);
        let isWordFound = searchForWord($, websiteKeyword);

        if(isWordFound) {
          console.log(`Word ${websiteKeyword} found at page ${url}`);
        } else {
          collectInternalLinks($);

          // In this short program, our callback is just calling crawl()
          callback();
        }
      });
    }

    const crawl = () => {
      if(numPagesVisited >= maxPagesToVisit) {
        console.log('Reached max limit of number of pages to visit.');

        return;
      }

      let nextPage = pagesToVisit.pop();
      if (nextPage in pagesVisited) {
        // We've already visited this page, so repeat the crawl
        crawl();
      } else {
        // New page we haven't visited
        visitPage(nextPage, crawl);
      }
    }

    pagesToVisit.push(startUrl);
    crawl();
  });
});
