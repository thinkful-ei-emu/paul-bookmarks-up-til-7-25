const express = require('express');
const bookmarkRouter=express.Router();
const bookmarks=require('./store');
const logger=require('./logger');
const uuid = require('uuid/v4');

bookmarkRouter
  .route('/bookmarks')
  .get((req,res)=>{
    res.send(bookmarks);
  })
  .post(express.json(), (req,res)=>{
    //more validation needed
    const {title, url, description, rating}=req.body;
    if (!title) {
      logger.error('Title is required');
      return res
        .status(400)
        .send('Invalid data');
    }
    if (!description) {
      logger.error('description is required');
      return res
        .status(400)
        .send('Invalid data');
    }
    if (!url) {
      logger.error('url is required');
      return res
        .status(400)
        .send('Invalid data');
    }
    if (rating && (typeof rating!==typeof 2 || (rating<0 || rating>5) ) ) {
      logger.error('rating must be a number between 0 and 5');
      return res
        .status(400)
        .send('Invalid data');
    }
    const id=uuid();
    const bookmark= {id, title, description, url, rating};
    bookmarks.push(bookmark);

    logger.info(`bookmark with id ${id} created`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(bookmark);
  });

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req,res)=>{
    const id=req.params.id;
    const foundBookmark=bookmarks.find(bookmark=>bookmark.id===id);
    if(!foundBookmark){
      logger.error(`bookmark with id ${id} not found.`);
      return res
        .status(404)
        .send('bookmark Not Found');
    }
    res.json(foundBookmark);
  })
  .delete((req,res)=>{
    const id=req.params.id;
    const foundIndex=bookmarks.findIndex(bookmark=>bookmark.id===id);
    console.log(foundIndex);
    if(foundIndex===-1){
      logger.error(`bookmark with id ${id} not found.`);
      return res
        .status(404)
        .send('bookmark Not Found');
    }

    bookmarks.splice(foundIndex,1);

    logger.info(`List with id ${id} deleted.`);
    res.status(204).end();
  });


module.exports = bookmarkRouter;