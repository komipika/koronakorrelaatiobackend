const { response } = require('express');
const googleTrends = require('google-trends-api');
const gtrendsRouter = require('express').Router();
const kuntakoodit = require('./../utility/luettelo.json');
const gtrendsKunnat = require('./../utility/gtrendsKunnat.json');

/*
© Authors:
Antti Heimonen
Maria Kangas
Konsta Kalliokoski
Vilma Patama
*/

/*
  Google Trendsin interestOverTime kertoo millä alueella hakusana on kaikkein haetuin 
  (eli suurin prosentuaalinen osuus aluuen kaikista hakusanoista).
  Tämän kunnan arvo on 100. 
  Muiden kuntien tulokset ovat suhteellisia tähän numeroon.
  Esim. Toisessa kunnassa arvo 50 tarkoittaisi, että hakua on tehty 
  prosentuaalisesti puolet vähemmän. 

  Haun voi tehdä halutulle ajan jaksolla, mutta tästä ei näe 
  kehitystä ajan kanssa, vaan jokaiselle kunnalle on vain yksi arvo.
*/

var trendsHakujenMaara = 0;

// Palauttaa hakusanan trendauksen Suomesta.
// Palautettava data on muotoa
// {
//   area211: 100,
//   area740: 97,
//   area851: 0, 
// }
gtrendsRouter.get('/', async (req, res) => {
  // Otetaan osoitteen mukana tuleeet arvot muuttujiin. Osoite on esim:
  // http://localhost:8000/gtrends?hakusana=korona&alkupvm=2020-05-01&loppupvm=2020-11-13
  const hakusana = req.query.hakusana;
  const alkupvm = req.query.alkupvm;
  const loppupvm = req.query.loppupvm;
 
  console.log(`hakusana ${hakusana}`); 
  trendsHakujenMaara += 1;
  if (trendsHakujenMaara > 1000) {
    console.log('Liikaa hakuja, nollataan laskuri');
    trendsHakujenMaara = 0;
  }  
  console.log(`Hakuja tehty: ${trendsHakujenMaara}`);
  
  googleTrends.interestByRegion
    ({
      keyword: hakusana,
      startTime: new Date(alkupvm),
      endTime: new Date(loppupvm),
      geo: 'FI',
      resolution: 'city'
    })
    .then(function (googleRes) {
      let trendsTulokset = JSON.parse(googleRes).default.geoMapData
      let tuloksetKunnittain = {}
        for(let i = 0; i < trendsTulokset.length; i++) {
          let kuntanimi = trendsTulokset[i].geoName;
          let arvo = trendsTulokset[i].value;
          let kuntakoodi = haeKuntakoodi(kuntanimi)
          if (kuntakoodi)
            tuloksetKunnittain[kuntakoodi] = arvo[0]
        }
       res.json(tuloksetKunnittain)
       if (tarkistaOnkoTyhja(tuloksetKunnittain)) {
         console.log("Ei hakutuloksia!")
       }
    })
    .catch((err) => {
      console.log(err)
    });
})


// Etsii kuntakoodin. Etsimisjärjestys on ensiksi kuntakoodit,
// toisena gtrendsKuntakoodit. Jos koodia ei löydy, niin palauttaa null.
const haeKuntakoodi = (kuntanimi) => {
  if (kuntakoodit[kuntanimi]) 
    return kuntakoodit[kuntanimi].koodi
  if (gtrendsKunnat[kuntanimi]) 
    return gtrendsKunnat[kuntanimi].koodi
  
  return null
} 

/* 
Puuttuvat kunnat

Kiiminki - Yhdistynyt Ouluun
Haukipudas - Yhdistynyt Ouluun
*/

// Tarkistaa onko tuloksetKunnittain tyhjä vai löytyykö hakuja
const tarkistaOnkoTyhja = (tuloksetKunnittain) => {
  for (var key in tuloksetKunnittain) {
    if(tuloksetKunnittain.hasOwnProperty(key))
      return false;
  }
  return true;
}

gtrendsRouter.get('/testi', async (req, res, next) => {
  JSONstat('google-trends-api').then(function(j) {
    if(j.error) {
      console.log("VIRHE");
      res.json(j)
    } else {
      res.send('<h1>virhesivu!</h1>')
    }
  }).catch(next)
});


module.exports = gtrendsRouter