const app = require('./app');
const { PORT } = require('./config');

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT} running in ${process.env.NODE_ENV} mode...`);
});