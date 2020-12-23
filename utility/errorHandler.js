/*
© Authors:
Antti Heimonen
Maria Kangas
Konsta Kalliokoski
Vilma Patama
*/

const errorHandler = (err, req, res, next) => {
  console.error(err)
  console.log(req);
  res.status(504).send('Haettua resurssia ei ole saatavilla')
}

module.exports = {
  errorHandler
}