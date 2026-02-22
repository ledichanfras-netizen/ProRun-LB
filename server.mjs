
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve absolute path to dist
const distPath = path.resolve(__dirname, 'dist');

// Serve os arquivos estáticos da pasta de build (dist)
app.use(express.static(distPath));

// Redireciona todas as rotas para o index.html (essencial para React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
