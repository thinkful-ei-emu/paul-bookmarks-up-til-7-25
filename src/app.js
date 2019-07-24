require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const logger= require('./logger');
const bookmarkRouter=require('./bookmark.router');
const validateBearerToken=require('./validateBearerToken');


const app = express();
const{NODE_ENV}=require('./config');

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(validateBearerToken);

app.get('/', (req, res) => {
  res.send('Hello, boilerplate!');
});

app.use(bookmarkRouter);

app.use(function errorHandler(error, req, res, next) {
  let response;
  if(error.routine==='string_to_uuid')
    return res.status(400).json({error:{message:'need uuid'}});
  if (process.env.NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    logger.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});


module.exports = app;