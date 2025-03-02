const express = require('express');
const app = express();
const PORT = 3002; // Try a different port

app.get('/', (req, res) => {
  res.send('Test server is running');
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});