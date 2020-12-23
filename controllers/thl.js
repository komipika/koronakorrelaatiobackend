const thlRouter = require('express').Router()
const JSONstat = require("jsonstat-toolkit");
const thlData = require('./../testdata.json'); // Lokaali THL-tiedosto testausta varten
const thlDataArrobj = require('./../test_arrobj.json'); // Lokaali THL-tiedosto testausta varten
const kuntakoodit = require('./../utility/luettelo.json')

/*
© Authors:
Antti Heimonen
Maria Kangas
Konsta Kalliokoski
Vilma Patama
*/

/*
Hakee Terveyden ja hyvinvoinnin laitoksen eli THL:n tarjoaman datan koronatartuntojen määrästä paikkakunnittain kahden tunnin välein.
*/


var _ = require('lodash')

const kunnatViikottain = "https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case.json?row=dateweek20200101-509030&row=hcdmunicipality2020-445171L&column=measure-444833"
// const kunnatViikottain = "https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case.json?row=dateweek2020010120201231-443686&row=hcdmunicipality2020-445171L&column=measure-444833"  // Vanha toimiva osoite ennen THL:n 21.12.2020 tekemää rakennemuutosta
const shptViikottain = "https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case.json"

let viimeksiPaivitetty = 0;
const paivitysVali = 7200000; // Päivitys 2h välein - Millisekunteina, eli 1000 ms = 1 sek
var paivitettyThlData;


// thl.js sisältää toiminnallisuuden THL:n dataan liittyviin pyyntöihin.
thlRouter.get('/', async (req, res) => {
  res.json(thlData)
})


// Testi osoite datan päivitysajan laskemiseen. Tämän tapaista voisi käyttää
// thldata funktiossa: Jos data on vanha, haetaan THL:ltä ja tallennetaan tiedostoon.
// Muuten haetaan vain tiedostosta.
thlRouter.get('/paivitys', async (req, res) => {
  let nyt = Date.now();  // Nykyinen aika millisekunteina
  let viesti = "";
  if ((nyt - paivitysVali) > viimeksiPaivitetty) {
    viesti = "Data on vanhentunut, päivitetään"
    viimeksiPaivitetty = Date.now()
  }
  else {
    viesti = "Data ei ole liian vanha"
  }
  console.log(viesti);
  res.send(viesti)
})


function paivitaThlData() {
  JSONstat(kunnatViikottain).then(function (j) {
    if (j.length) {
      // Luo JSONstat-olion avulla datan sisältävä arrobj
      let rows = j.Dataset(0).toTable({
        type: "arrobj",
        by: "hcdmunicipality2020",
        bylabel: true,
        field: "label"
      });
      // Luo json-muotoinen data arrobjektista   
      let finaldata = rows.reduce(muunnaDataArrobj, {})
      // res.json(finaldata) 
      console.log(finaldata);       
      console.log(`${nyt}`, "Päivitystesti erillisestä funktiosta");
    }
  })
}

  
// Hakee ajantasaisen THL:n koronadatan ja muokkaa sen json-muotoon
// palautettavaksi
thlRouter.get('/thldata', async (req, res, next) => {  
  let nyt = Date.now(); 
  if ((nyt - paivitysVali) < viimeksiPaivitetty) {
    console.log(nyt - paivitysVali);
    console.log("THL data ei ole vanhentunut. Käytetään muistissa olevaa");
    res.json(paivitettyThlData)
  }
  else{
    console.log("THL data on vanhentunut. Päivitetään...");
    JSONstat(kunnatViikottain).then(function (j) {
      if (j.length) {
        // Luo JSONstat-olion avulla datan sisältävä arrobj
        let rows = j.Dataset(0).toTable({
          type: "arrobj",
          by: "hcdmunicipality2020",
          bylabel: true,
          field: "label"
        });
        // Luo json-muotoinen data arrobjektista   
        let finaldata = rows.reduce(muunnaDataArrobj, {})
        paivitettyThlData = finaldata;
        viimeksiPaivitetty = nyt;
        res.json(finaldata)
      }
    }).catch(next)
  }
})


// Esimerkkifunktio virheen käsittelystä
thlRouter.get('/testi', async (req, res, next) => {
  JSONstat("https://samppppppppppo.thl.fi/pivot/pr").then(function (j) {
    if (j.error) {
      console.log("VIRHE");
      res.json(j)
    } else {
      res.send('<h1>virhesivu!</h1>')
    }
  }).catch(next)
})


// Muuntaa THL:n tarjoman datan viikkottaiset määrät
// meidän haluamaan muotoon.
// Esim Viikon 43 määrä Helsingistä löytyy finaldata["2020"]["43"]["Helsinki"]
// TODO: Lopulliseen dataan muutettava kuntien nimet kuntien tunnistekoodeiksi
thlRouter.get('/lokaalitesti', async (req, res) => {
  console.log("Lokaali testidata")

  // Ottaa testidatasta kopion, jottei alkuperäistä käsitellä useaan kertaan
  let testiDataArrobj = _.cloneDeep(thlDataArrobj)
  console.log(`Datan koko: ${testiDataArrobj.length}`)

  // Käsiteltävä data on lista, jossa jokainen viikko on omana objektinaan.
  // Jokainen viikko-objekti sisältää tiedon viikosta, turhan measure-kentän
  // ja kuntien tapausmäärät.
  // Esimerkki:
  // [
  //   {
  //     "dateweek2020010120201231":"Vuosi 2020 Viikko 01",
  //     "measure":"Tapausten lukumäärä",
  //     "Brändö":null,
  //     "Eckerö":1,
  //     ...
  //     "Vihti":null
  //   },
  //     ...
  //   {
  //     "dateweek2020010120201231":"Vuosi 2020 Viikko 35",
  //     "measure":"Tapausten lukumäärä",
  //     "Brändö":7,
  //     "Eckerö":6,
  //     ...
  //     "Vihti":null
  //   },
  //   ...
  // ]

  // Reduce käy jokaisen viikko-objektin läpi ja lisää datan
  // meidän haluamassa muodossa finaldata objektiin.
  let finaldata = testiDataArrobj.reduce(muunnaDataArrobj, {})
  // console.log(kuntakoodit.Alajarvi.koodi);

  // Palautetaan pyytäjälle data JSON-muodossa
  res.json(finaldata)
})


// Osa THL-datan muutonprosessia
const muunnaDataArrobj = (edelliset, viikkodata) => {
  // Otetaan aikakentästä vuosi ja kuukausi erikseen
  let aikaKentanSanat = viikkodata.dateweek20200101.split(' ')
  let vuosi = aikaKentanSanat[1]
  let viikko = aikaKentanSanat[3]

  // Datassa on myös objekti, jossa on tapauksien kumulatiiviset määrät.
  // Jätetään se pois.
  if (vuosi === undefined)
    return edelliset;

  // Tuhotaan dateweek2020010120201231 ja measure-kentät.
  // Muuten niitä kohdellaan samoin kuin kuntia.
  delete viikkodata.dateweek20200101
  delete viikkodata.measure

  let jsonViikko = {
    [vuosi]: {
      [viikko]: viikkodata
    }
  }

  // THL:n datassa 0 arvot on merkattu ". .". Korvataan nämä nollilla
  Object.keys(viikkodata).forEach(key => {
    if (kuntakoodit[key]) {
      viikkodata[kuntakoodit[key].koodi] =
        viikkodata[key] = isNaN(viikkodata[key]) ? 0 : viikkodata[key];
      delete viikkodata[key];
    }
    else
      console.log(`Kunta ${key} ei löydy kuntalistasta!`);
  });

  // Yhistetään luotu viikkodata aikaisempiin
  return _.merge(edelliset, jsonViikko)
}


module.exports = thlRouter