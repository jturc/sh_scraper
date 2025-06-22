require("dotenv").config();

const sendSMS = require("./sendSMS");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

class Show {
  constructor(jour, url, found, prime) {
    this.jour = jour;
    this.url = url;
    this.found = found;
    this.prime = prime;
  }
  setFound(found){
    this.found = found;
  }
}

async function scrapeStubHub(url, prime) {
  // console.log("scrapeStubHub()");
  // console.log("starting puppeteer");
  const browser = await puppeteer.launch({
    args: ["--ignore-certificate-errors"],
    headless: true,
  });
  // console.log("creating new page");
  const page = await browser.newPage();
  // console.log("visiting page", url);
  await page.goto(url, { timeout: 500000 });
  // console.log("page loaded");
  page.on("console", (msg) => {
    // console.log("Browser console:", msg.text());
  });
  const ticket = await page.evaluate((prime) => {
    const elements = document.querySelectorAll("[data-listing-id]");

    if (!elements) {
      console.log("NO ELEMENTS");
      return null;
    }
    console.log("ELEMENTS FOUND");
    var element = null;
    for (let i = 0; i < elements.length; i++) {
      var fakeButton = elements[i].getElementsByClassName("lazyload-wrapper");
      if(fakeButton.length == 0) {
        element = elements[i];
        break;
      }
    }

    if (element == null) {
      console.log("NO ELEMENT");
      return null;
    }
    console.log("ELEMENT FOUND");

    const listingId = element.getAttribute("data-listing-id");

    console.log("LISTING ID =", listingId);
    if (listingId < 0) {
      return null;
    }
    const findPriceElement = (node) => {
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.trim().startsWith("C$")
      ) {
        return node.parentNode;
      }

      for (const child of node.childNodes) {
        const result = findPriceElement(child);
        if (result) {
          return result;
        }
      }

      return null;
    };

    const priceElement = findPriceElement(element);
    var price = 0.0
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      price = parseFloat(priceText.replace("C$", "").replace(",", ""));
    }

    const findSectionElement = (node) => {
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.trim().startsWith("Section")
      ) {
        return node.parentNode;
      }

      for (const child of node.childNodes) {
        const result = findSectionElement(child);
        if (result) {
          return result;
        }
      }

      return null;
    };

    const sectionElement = findSectionElement(element);
    var section = "";
    var row = "";
    console.log("Section Element : ", sectionElement)
    if (sectionElement) {
      var sectionrow = sectionElement.textContent.trim().split("|");
      section = sectionrow[0].replace("Section", "").trim();
      row = sectionrow[1].replace("Row", "").trim();
      console.log("SectionText : ", section);
      console.log("SectionText : ", row);
    }
    
    if(listingId && price) {
      return {
        listingId,
        price,
        section,
        row,
      };
    }

    return null;
  }, prime);

  // console.log("closing browser");
  await browser.close();
  // console.log("returning ticket");
  return ticket;
}

scrapeAndAlert = async (show) => {
  var s = show;
  var url = s.url;
  console.log("Scraping for show : ", s.jour);
  const ticket = await scrapeStubHub(url, show.prime);
  var price = process.env.PRICE_ALERT_THRESHOLD;
  if (show.prime == true) {
    price = process.env.PRIME_PRICE_ALERT_THRESHOLD;
  }
  if (ticket) {
    // console.log("Stubhub Ticket found :", ticket);
    if (ticket.price < price) {
      if (show.prime == true && ticket.row > 10) {
        console.log("Stubhub Ticket found but row to high for prime :", ticket);
        return false;
      }
      await sendSMS(ticket.price, ticket.section, ticket.row, s.jour);
      console.log("Stubhub Ticket found and SMS Sent for :", ticket);
      return true;
    } else {
      console.log("Stubhub Ticket to expensive for now :", ticket);
      return false;
    }
  } else {
    console.log("Problem with stubhub not able to scrub tickets!!")
  }
};

(async () => {
  scrapeInterval = async () => {
    console.log(new Date());
    for (let i = 0; i < shows.length; i++) {
      // console.log("found is equal to : ", shows[i].found);
      if(shows[i].found == false) {
        // console.log("running scrape");
        var found = await scrapeAndAlert(shows[i]);
        if(found == true) {
          console.log("found for show : ", shows[i].jour);
          shows[i].setFound(true);
          // console.log("found is now equal to : ", shows[i].found);
        }
      }
    }
  };
  // Set the interval to run the scrapeStubHub function every X milliseconds
  // (e.g., 300000 milliseconds = 5 minutes)
  var lundi = new Show("Lundi 3 Juin", `https://www.stubhub.ca/toronto-blue-jays-toronto-tickets-6-3-2024/event/152171652/?quantity=3&sections=1828415%2C1442830%2C91786%2C82219%2C82218%2C110044%2C110043%2C96079%2C1442877%2C96078%2C110046%2C91783%2C91784%2C1442878%2C82221%2C110045%2C91785%2C1442875%2C82220%2C82222%2C110047%2C1828414%2C1828413%2C1828438%2C1442880%2C1828416%2C1828417%2C1828418%2C1828419%2C1828420%2C1828421%2C1828422%2C1828423&ticketClasses=22526%2C3824%2C4209%2C22546&rows=3197630%2C3197638%2C3197971%2C3197967%2C3197965%2C3197968%2C3197964%2C3197965%2C3197964%2C817348%2C817350%2C817337%2C817346%2C817335%2C817344%2C817041%2C817038%2C817042%2C817033%2C817044%2C817032%2C817008%2C817004%2C817007%2C816995%2C816936%2C1307985%2C816938%2C816935%2C816935%2C816930%2C1307987%2C816939%2C3197949%2C816887%2C816891%2C3197940%2C3197934%2C3197936%2C3197936%2C816890%2C3197933%2C3197932%2C816891%2C3197943%2C3197942%2C3197941%2C3198008%2C3198016%2C3198010%2C3198021%2C3198016%2C3198017%2C3198013%2C3198007%2C3198009%2C3198025%2C3198025%2C3198007%2C3197995%2C3197995%2C3198021%2C3198022%2C3198019%2C3198004%2C3198002%2C3198021%2C3198020%2C3197998%2C3198019%2C3197996%2C3197659%2C816974%2C1308070%2C816969%2C1308073%2C816963%2C816969%2C817264%2C817268%2C817264%2C817263%2C817266%2C817258%2C817254%2C817254%2C817263%2C817100%2C817097%2C817104%2C817101%2C1308594%2C817191%2C817186%2C1308597%2C3197670%2C3197671%2C817156%2C817159%2C817164%2C817167%2C817167%2C817165%2C817159%2C817155%2C817128%2C817132%2C817127%2C817124%2C817126%2C817128%2C817135%2C817222%2C817224%2C817225%2C817225%2C1308680%2C1308681%2C1308680%2C1308678%2C1308680%2C3197648%2C3197640%2C3197646%2C817064%2C817068%2C817062%2C817070%2C817065%2C817070%2C3200341%2C3200334%2C3200343%2C3200331%2C3200343%2C3200345%2C3200334%2C3200336%2C3197978%2C3197983%2C3197978%2C3197982%2C3197624%2C3197620%2C3197614%2C3197685%2C3197691%2C3197694%2C3197694%2C3197701%2C3197710%2C3197709%2C3197707%2C3197711%2C3197716%2C3197730%2C3197724%2C3197736%2C3197739%2C3197744%2C3197748%2C3197755%2C3197754%2C3197757%2C3197765%2C3197773%2C3197767%2C3197773&seatTypes=&listingQty=`, false, false);
  var mardi = new Show("Mardi 4 Juin", `https://www.stubhub.ca/toronto-blue-jays-toronto-tickets-6-4-2024/event/152171657/?quantity=3&sections=1828415%2C1442830%2C91786%2C82219%2C82218%2C110044%2C110043%2C96079%2C1442877%2C96078%2C110046%2C91783%2C91784%2C1442878%2C82221%2C110045%2C91785%2C1442875%2C82220%2C82222%2C110047%2C1828414%2C1828413%2C1828438%2C1442880%2C1828416%2C1828417%2C1828418%2C1828419%2C1828420%2C1828421%2C1828422%2C1828423&ticketClasses=22526%2C3824%2C4209%2C22546&rows=3197630%2C3197638%2C3197971%2C3197967%2C3197965%2C3197968%2C3197964%2C3197965%2C3197964%2C817348%2C817350%2C817337%2C817346%2C817335%2C817344%2C817041%2C817038%2C817042%2C817033%2C817044%2C817032%2C817008%2C817004%2C817007%2C816995%2C816936%2C1307985%2C816938%2C816935%2C816935%2C816930%2C1307987%2C816939%2C3197949%2C816887%2C816891%2C3197940%2C3197934%2C3197936%2C3197936%2C816890%2C3197933%2C3197932%2C816891%2C3197943%2C3197942%2C3197941%2C3198008%2C3198016%2C3198010%2C3198021%2C3198016%2C3198017%2C3198013%2C3198007%2C3198009%2C3198025%2C3198025%2C3198007%2C3197995%2C3197995%2C3198021%2C3198022%2C3198019%2C3198004%2C3198002%2C3198021%2C3198020%2C3197998%2C3198019%2C3197996%2C3197659%2C816974%2C1308070%2C816969%2C1308073%2C816963%2C816969%2C817264%2C817268%2C817264%2C817263%2C817266%2C817258%2C817254%2C817254%2C817263%2C817100%2C817097%2C817104%2C817101%2C1308594%2C817191%2C817186%2C1308597%2C3197670%2C3197671%2C817156%2C817159%2C817164%2C817167%2C817167%2C817165%2C817159%2C817155%2C817128%2C817132%2C817127%2C817124%2C817126%2C817128%2C817135%2C817222%2C817224%2C817225%2C817225%2C1308680%2C1308681%2C1308680%2C1308678%2C1308680%2C3197648%2C3197640%2C3197646%2C817064%2C817068%2C817062%2C817070%2C817065%2C817070%2C3200341%2C3200334%2C3200343%2C3200331%2C3200343%2C3200345%2C3200334%2C3200336%2C3197978%2C3197983%2C3197978%2C3197982%2C3197624%2C3197620%2C3197614%2C3197685%2C3197691%2C3197694%2C3197694%2C3197701%2C3197710%2C3197709%2C3197707%2C3197711%2C3197716%2C3197730%2C3197724%2C3197736%2C3197739%2C3197744%2C3197748%2C3197755%2C3197754%2C3197757%2C3197765%2C3197773%2C3197767%2C3197773&seatTypes=&listingQty=`, false, false);
  var mercredi = new Show("Mercredi 5 Juin", `https://www.stubhub.ca/toronto-blue-jays-toronto-tickets-6-5-2024/event/152171644/?quantity=3&sections=1828415%2C1442830%2C91786%2C82219%2C82218%2C110044%2C110043%2C96079%2C1442877%2C96078%2C110046%2C91783%2C91784%2C1442878%2C82221%2C110045%2C91785%2C1442875%2C82220%2C82222%2C110047%2C1828414%2C1828413%2C1828438%2C1442880%2C1828416%2C1828417%2C1828418%2C1828419%2C1828420%2C1828421%2C1828422%2C1828423&ticketClasses=22526%2C3824%2C4209%2C22546&rows=3197630%2C3197638%2C3197971%2C3197967%2C3197965%2C3197968%2C3197964%2C3197965%2C3197964%2C817348%2C817350%2C817337%2C817346%2C817335%2C817344%2C817041%2C817038%2C817042%2C817033%2C817044%2C817032%2C817008%2C817004%2C817007%2C816995%2C816936%2C1307985%2C816938%2C816935%2C816935%2C816930%2C1307987%2C816939%2C3197949%2C816887%2C816891%2C3197940%2C3197934%2C3197936%2C3197936%2C816890%2C3197933%2C3197932%2C816891%2C3197943%2C3197942%2C3197941%2C3198008%2C3198016%2C3198010%2C3198021%2C3198016%2C3198017%2C3198013%2C3198007%2C3198009%2C3198025%2C3198025%2C3198007%2C3197995%2C3197995%2C3198021%2C3198022%2C3198019%2C3198004%2C3198002%2C3198021%2C3198020%2C3197998%2C3198019%2C3197996%2C3197659%2C816974%2C1308070%2C816969%2C1308073%2C816963%2C816969%2C817264%2C817268%2C817264%2C817263%2C817266%2C817258%2C817254%2C817254%2C817263%2C817100%2C817097%2C817104%2C817101%2C1308594%2C817191%2C817186%2C1308597%2C3197670%2C3197671%2C817156%2C817159%2C817164%2C817167%2C817167%2C817165%2C817159%2C817155%2C817128%2C817132%2C817127%2C817124%2C817126%2C817128%2C817135%2C817222%2C817224%2C817225%2C817225%2C1308680%2C1308681%2C1308680%2C1308678%2C1308680%2C3197648%2C3197640%2C3197646%2C817064%2C817068%2C817062%2C817070%2C817065%2C817070%2C3200341%2C3200334%2C3200343%2C3200331%2C3200343%2C3200345%2C3200334%2C3200336%2C3197978%2C3197983%2C3197978%2C3197982%2C3197624%2C3197620%2C3197614%2C3197685%2C3197691%2C3197694%2C3197694%2C3197701%2C3197710%2C3197709%2C3197707%2C3197711%2C3197716%2C3197730%2C3197724%2C3197736%2C3197739%2C3197744%2C3197748%2C3197755%2C3197754%2C3197757%2C3197765%2C3197773%2C3197767%2C3197773&seatTypes=&listingQty=`, false, false);

  var shows = [
    lundi,
    mardi,
    mercredi,
  ]
  const scrapeFrequency = 10_000;
  setInterval(scrapeInterval, scrapeFrequency);
})();