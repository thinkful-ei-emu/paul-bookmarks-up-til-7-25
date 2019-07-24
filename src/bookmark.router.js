const express = require('express');
const bookmarkRouter = express.Router();
const bookmarksService = require('./bookmarksService');
const logger = require('./logger');
const uuid = require('uuid/v4');
const { isWebUri } = require('valid-url');
const xss=require('xss');

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const db = req.app.get('db');
    bookmarksService.getAllItems(db)
      .then(bookmarks => {
        res.json(bookmarks.map(bookmark=>cleanUp(bookmark)));
      })
      .catch(next);
  })
  .post(express.json(), (req, res,next) => {
    //more validation needed
    const db = req.app.get('db');
    const { title, url, description, rating } = req.body;
    if (!title) {
      logger.error('Title is required');
      return res
        .status(400)
        .json({
          error: { message: 'Missing \'title\' in request body' }
        });
    }
    /* if (!description) {
      logger.error('description is required');
      return res
        .status(400)
        .send('Invalid data');
    } */
    if (!url) {
      logger.error('url is required');
      return res
        .status(400)
        .json({
          error: { message: 'Missing \'url\' in request body' }
        });
    }
    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`);
      return res.status(400).send({
        error: { message: '\'url\' must be a valid URL' }
      });
    }
    if (rating!==undefined && (typeof rating !== typeof 2 || (rating < 1 || rating > 5))) {
      logger.error('rating must be a number between 1 and 5');
      return res
        .status(400)
        .send({
          error: { message: 'if \'rating\' is provided, it must be a number and be between 1 and 5' }
        });
    }

    

    const bookmark = { title, description, url, rating };
    bookmarksService.insertItem(db, bookmark)
      .then(insertedB => {
        logger.info(`bookmark with id ${insertedB.id} created`);
        res
          .status(201)
          .location(`/bookmarks/${insertedB.id}`)
          .json(cleanUp(insertedB));
      })
      .catch(next);



  });

bookmarkRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    bookmarksService.getById(
      req.app.get('db'),
      req.params.id
    )
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: 'Bookmark doesn\'t exist' }
          });
        }
        res.bookmark = bookmark; // save the article for the next middleware
        next(); // don't forget to call next so the next middleware happens!
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(cleanUp(res.bookmark));
  })
  .delete((req, res,next) => {
    const db = req.app.get('db');
    const id = req.params.id;
    bookmarksService.deleteById(db, id)
      .then(actual => {
        logger.info(`List with id ${id} deleted.`);
        res.status(204).end();
      })
      .catch(next);
  });


function cleanUp(bookmark){
  return{
    id:bookmark.id,
    title:xss(bookmark.title),
    rating:bookmark.rating,
    url:xss(bookmark.url),
    description:xss(bookmark.description)
  };
}



module.exports = bookmarkRouter;