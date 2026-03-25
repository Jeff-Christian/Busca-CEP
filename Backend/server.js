const express = require('express');
const cors = require('cors');

const app = express(); // 👉 ESSA LINHA TEM QUE EXISTIR ANTES DE TUDO

app.use(cors());
app.use(express.json());

// rota teste
app.get('/', (req, res) => {
  res.send('API rodando 🚀');
});

// 👉 SUA ROTA DO CEP VEM DEPOIS
app.get('/cep/:cep', async (req, res) => {
  const { cep } = req.params;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return res.status(404).json({ erro: 'CEP não encontrado' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar CEP' });
  }
});

// subir servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});