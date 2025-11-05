const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// ==================================================
// Configuração
// ==================================================
const app = express();
const port = 3000;

// ==================================================
// Middlewares
// ==================================================
app.use(cors()); // Habilita o CORS
app.use(express.json()); // Habilita o parse de JSON no body

// ==================================================
// Conexão com o Banco de Dados (PostgreSQL)
// ==================================================
const pool = new Pool({
  user: 'thomas',
  host: 'localhost',
  database: 'Backend',
  password: '12345',
  port: 5432, // Porta padrão do PostgreSQL
});

/*
  ---------------------------------------------------
  SQL PARA CRIAR A TABELA (Fornecido por você):
  ---------------------------------------------------
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ---------------------------------------------------
*/

// ==================================================
// Rotas da API (CRUD para Usuários)
// ==================================================

// Rota principal
app.get('/', (req, res) => {
  res.send('API CRUD de usuários está no ar! Use o endpoint /users');
});

// [CREATE] Criar um novo usuário (Registro)
app.post('/users', async (req, res) => {
  const { nome, email, senha, telefone } = req.body;

  // Validação simples
  if (!nome || !email || !senha || !telefone) {
    return res
      .status(400)
      .json({ message: 'Campos nome, email, senha e telefone são obrigatórios.' });
  }

  try {
    // Verifica se o email já existe
    const emailExists = await pool.query('SELECT 1 FROM users WHERE email = $1', [
      email,
    ]);
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }

    // !! ATENÇÃO: Salvando a senha como texto puro !!
    const { rows } = await pool.query(
      'INSERT INTO users (nome, email, senha, telefone) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, telefone, created_at',
      [nome, email, senha, telefone] // A senha é salva diretamente
    );

    res
      .status(201)
      .json({ message: 'Usuário criado com sucesso', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// [READ] Obter todos os usuários
app.get('/users', async (req, res) => {
  try {
    // Seleciona colunas específicas (sem a senha)
    const { rows } = await pool.query(
      'SELECT * FROM users'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// [READ] Obter um usuário por ID
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      // Seleciona colunas específicas (sem a senha)
      'SELECT id, nome, email, telefone, created_at FROM users WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// [UPDATE] Atualizar dados do usuário (Nome, Email, Telefone)
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET 
         nome = COALESCE($1, nome),
         email = COALESCE($2, email),
         telefone = COALESCE($3, telefone),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, nome, email, telefone, updated_at`,
      [nome || null, email || null, telefone || null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário atualizado com sucesso', user: rows[0] });
  } catch (err) {
    console.error(err);
    // Erro comum: email duplicado
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email já está em uso.' });
    }
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// [DELETE] Deletar um usuário
app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.status(200).json({ message: 'Usuário deletado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// ==================================================
// Iniciar o Servidor
// ==================================================
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});