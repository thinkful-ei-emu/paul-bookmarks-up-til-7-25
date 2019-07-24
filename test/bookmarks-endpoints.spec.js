const knex = require('knex');
const app = require('../src/app');



describe('Bookmarks Endpoints', function () {
  let db;
  let testSeed = makeTestSeed();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });

    app.set('db', db);
  });

  const cleanArticles = () => db('bookmarks').truncate();
  before('clean the table', cleanArticles);
  afterEach('clean the table', cleanArticles);
  after('disconnect from db', () => db.destroy());



  describe('XSS attack bookmark, in various ways',()=>{
    const malBook={
      id:'2252a2b2-b296-4912-b621-a6f2a4db4ac9',
      title:'Naughty naughty very naughty <script>alert("xss");</script>',
      url:'https://www.google.com',
      description:'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
      rating:5
    };
    beforeEach('insert malicious bookmark', ()=>{
      return db.into('bookmarks').insert([malBook]);
    });

    it('removes xss attack content from GET /bookmarks/:id', ()=>{
      return supertest(app)
        .get('/bookmarks/2252a2b2-b296-4912-b621-a6f2a4db4ac9')
        .set('Authorization', 'bearer ' + process.env.API_TOKEN)
        .expect(200)
        .expect(res=>{
          expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
          expect(res.body.description).to.eql('Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.');
        });
    });

    it('removes xss attack content from GET /bookmarks/', ()=>{
      return supertest(app)
        .get('/bookmarks')
        .set('Authorization', 'bearer ' + process.env.API_TOKEN)
        .expect(200)
        .expect(res=>{
          expect(res.body[0].title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
          expect(res.body[0].description).to.eql('Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.');
        });
    });

    it('removes xss attack content from POST /bookmarks', ()=>{
      return db('bookmarks').where('id','=',malBook.id)
        .delete()
        .then(()=>
          supertest(app)
            .post('/bookmarks')
            .set('Authorization', 'bearer ' + process.env.API_TOKEN)
            .send(malBook)
            .expect(201)
            .expect(res=>{
              expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
              expect(res.body.description).to.eql('Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.');
            })
        );
    });



  });


  describe('DELETE /bookmarks/:id', () => {
    context('Given there are articles in the database', () => {
      beforeEach('adding data to table', () => {
        return db
          .into('bookmarks')
          .insert(testSeed);
      });

      it('responds with 204 and removes the bookmark', () => {
        const removeid = '1ad6d87c-1701-43c7-b64f-79aa04420d02';
        const expected = testSeed.filter(bookmark => bookmark.id !== removeid);
        return supertest(app)
          .delete(`/bookmarks/${removeid}`)
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .expect(204)
          .then(() =>
            supertest(app)
              .get('/bookmarks')
              .set('Authorization', 'bearer ' + process.env.API_TOKEN)
              .expect(expected)
          );
      });

      it('responds with 404 if id is there', () => {
        const removeid = '2252a2b2-b296-4912-b621-a6f2a4db4ac9';
        return supertest(app)
          .delete(`/bookmarks/${removeid}`)
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .expect(404)
          .then(() =>
            supertest(app)
              .get('/bookmarks')
              .set('Authorization', 'bearer ' + process.env.API_TOKEN)
              .expect(testSeed)
          );
      });

    });
  });


  describe('POST /bookmarks', () => {

    it('creates a bookmark, responding with 201 and checks if database has that bookmark', () => {
      const newbook = {
        title: 'testNewBook',
        url: 'https://www.ask.com',
        description: 'yolo',
        rating: 2
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newbook)
        .set('Authorization', 'bearer ' + process.env.API_TOKEN)
        .expect(201)
        .expect(res => {
          newbook.id = res.body.id;
          expect(res.body).to.eql(newbook);
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
          return db.select('*').where('id', '=', newbook.id);
        })
        .then(databaseRes => {
          console.log(databaseRes.body);
          expect(databaseRes.body).to.eql(newbook);
        });

    });

    it('creates a bookmark, responding with 201 and checks by GET /bookmarks whether it\'s there', () => {
      const newbook = {
        title: 'testNewBook',
        url: 'https://www.ask.com',
        description: 'yolo',
        rating: 2
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newbook)
        .set('Authorization', 'bearer ' + process.env.API_TOKEN)
        .expect(201)
        .expect(res => {
          newbook.id = res.body.id;
          expect(res.body).to.eql(newbook);
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/bookmarks/${newbook.id}`)
            .set('Authorization', 'bearer ' + process.env.API_TOKEN)
            .expect(postRes.body)
        );

    });

    const requiredFields = ['title', 'url'];
    requiredFields.forEach(field => {

      const newbook = {
        title: 'whatr',
        url: 'https://www.google.com',
        description: 'Test new article content...',
        rating: 1
      };

      delete newbook[field];

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .send(newbook)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    it('responds with 400 and error message when \'rating\' is given and is not a number', () => {
      const newbook = {
        title: 'whatr',
        url: 'https://www.google.com',
        description: 'Test new article content...',
        rating: 'hi'
      };
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', 'bearer ' + process.env.API_TOKEN)
        .send(newbook)
        .expect(400, {
          error: { message: 'if \'rating\' is provided, it must be a number and be between 1 and 5' }
        });
    });

    it('responds with 400 and error message when \'rating\' is given and is not between 1 and 5', () => {
      const newbook = {
        title: 'whatr',
        url: 'https://www.google.com',
        description: 'Test new article content...',
        rating: 0
      };
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', 'bearer ' + process.env.API_TOKEN)
        .send(newbook)
        .expect(400, {
          error: { message: 'if \'rating\' is provided, it must be a number and be between 1 and 5' }
        });
    });
  });

  describe('GET /bookmarks', () => {
    context('without any data', () => {
      it('calling getAllItems() using /bookmarks should give us back an empty array', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .expect(res => {
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array').that.has.lengthOf(0);
          });
      });

      it('getById() using /bookmarks/:id should give us back 404 error', () => {
        return supertest(app)
          .get('/bookmarks/1ad6d87c-1701-43c7-b64f-79aa04420d02')
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .expect(404);
      });

    });
    context('with data', () => {
      beforeEach('adding data to table', () => {
        return db
          .into('bookmarks')
          .insert(testSeed);
      });
      it('getAllItems() using /bookmarks should give us back all bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .expect(200, testSeed);
      });
      it('getById() using /bookmarks/:id should give us back the object', () => {
        return supertest(app)
          .get('/bookmarks/1ad6d87c-1701-43c7-b64f-79aa04420d02')
          .set('Authorization', 'bearer ' + process.env.API_TOKEN)
          .expect(200, testSeed[0]);
      });
    });

  });

});




function makeTestSeed() {
  return [
    {
      id: '1ad6d87c-1701-43c7-b64f-79aa04420d02',
      title: 'book1',
      url: 'https://www.google.com',
      description: 'Wow1',
      rating: 5
    },
    {
      id: '619984c8-3073-49cb-8ef5-f7fb3cfef9b3',
      title: 'book2',
      url: 'https://www.gmail.com',
      description: 'Wow2',
      rating: 2
    },
    {
      id: 'a76df5ef-81b9-439e-a9e1-ffd2454ca77c',
      title: 'book3',
      url: 'https://www.discord.com',
      description: 'Wow3',
      rating: 4
    },
    {
      id: '122798fa-7a37-4fed-aae7-4083d91ab49d',
      title: 'book4',
      url: 'https://www.youtube.com',
      description: 'Wow4',
      rating: 1
    },
  ];
} 