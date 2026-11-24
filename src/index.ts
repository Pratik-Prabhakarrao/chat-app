import app from './app';

// Start the API on PORT from .env, or use port 3000 by default.
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Chat API running on port ${port}`);
});
