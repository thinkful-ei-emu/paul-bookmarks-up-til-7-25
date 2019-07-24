const bookmarksService={
  getAllItems(db){
    return db('bookmarks')
      .select('*');
  },
  insertItem(db,newItem){
    return db('bookmarks')
      .insert(newItem)
      .returning('*')
      .then(rows=>rows[0]);
  },
  getById(db,id){
    return db('bookmarks')
      .select('*')
      .where('id','=',id)
      .first();
  },
  deleteById(db,id){
    return db('bookmarks')
      .where('id','=',id)
      .delete();
  },
  updateById(db,id,uItem){
    return db('bookmarks')
      .where('id','=',id)
      .update(uItem);
  }

};


module.exports=bookmarksService;