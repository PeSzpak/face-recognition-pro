# Face Recognition Pro

Sistema profissional de reconhecimento facial com IA, 100% local via Docker.

## 🚀 Início Rápido

```bash
# 1. Clone e entre no diretório
git clone https://github.com/PeSzpak/face-recognition-pro.git
cd face-recognition-pro

# 2. Inicie os containers (primeira vez baixa modelos - 5-10 min)
docker compose up -d --build

# 3. Aguarde inicialização (~30 segundos após build)
docker compose logs backend -f

# 4. Acesse quando ver "Application startup complete"
```

### 🌐 URLs de Acesso

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Qdrant Dashboard**: http://localhost:6333/dashboard

### 🔐 Credenciais Padrão

```
Email: admin@facerecognition.pro
Senha: admin123
```

## 🎯 Funcionalidades

### ✅ Totalmente Funcionais
- **Autenticação JWT** - Login seguro com tokens
- **Reconhecimento Facial** - DeepFace + Facenet512 (512D vectors)
- **Upload/Webcam** - Múltiplas formas de captura
- **CRUD de Pessoas** - Criar, listar, editar, deletar
- **Múltiplas Fotos** - Melhor precisão com várias imagens
- **Dashboard Real-Time** - Estatísticas do banco de dados
- **Logs Auditáveis** - Todos reconhecimentos salvos
- **Vector Search** - Busca rápida com Qdrant
- **100% Local** - Zero dependências externas

### 🚫 Removido
- ❌ Todos os mocks e simulações
- ❌ Dados fake
- ❌ Fallbacks de desenvolvimento

## 🏗️ Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│  PostgreSQL  │
│   React     │      │   FastAPI    │      │   Database   │
│   :5173     │      │   :8000      │      │   :5432      │
└─────────────┘      └──────┬───────┘      └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Qdrant    │
                     │ Vector Store │
                     │    :6333     │
                     └──────────────┘
```

## 📋 Pré-requisitos

- Docker Desktop instalado
- 8GB RAM disponível
- 5GB espaço em disco

## 🛠️ Tecnologias

### Backend
- **FastAPI** 0.104.1 - Framework web moderno
- **PostgreSQL** 15 - Banco relacional
- **Qdrant** 1.15.5 - Vector database
- **DeepFace** 0.0.92 - Reconhecimento facial
- **TensorFlow** 2.15.0 - Machine learning
- **OpenCV** - Detector de rostos

### Frontend
- **React** 18 - UI library
- **TypeScript** 5 - Type safety
- **Vite** 5 - Build tool
- **TailwindCSS** 3 - Styling

## 📂 Estrutura do Projeto

```
face-recognition-pro/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints REST
│   │   ├── core/         # Database, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Lógica de negócio
│   │   └── utils/        # Helpers
│   ├── models/           # Modelos DeepFace (auto-download)
│   ├── uploads/          # Fotos temporárias
│   ├── requirements.txt  # Dependências Python
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── contexts/     # Context API
│   │   ├── services/     # API clients
│   │   ├── styles/       # CSS
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── database/
│   └── init.sql          # Schema inicial
├── docker-compose.yml
└── README.md
```

## 🔧 Comandos Úteis

### Gerenciar Containers

```bash
# Iniciar
docker compose up -d

# Parar
docker compose down

# Reiniciar apenas backend
docker compose restart backend

# Ver logs
docker compose logs -f backend

# Reconstruir tudo
docker compose up -d --build --force-recreate
```

### Verificar Status

```bash
# Status dos containers
docker compose ps

# Ver banco de dados
docker exec face-recognition-db psql -U admin -d face_recognition -c "SELECT * FROM persons;"

# Ver logs de reconhecimento
docker exec face-recognition-db psql -U admin -d face_recognition -c "SELECT * FROM recognition_logs ORDER BY created_at DESC LIMIT 10;"

# Ver embeddings no Qdrant
curl http://localhost:6333/collections/face_embeddings | python3 -m json.tool
```

## 📖 Como Usar

### 1. Primeiro Acesso

1. Abra http://localhost:5173
2. Faça login com credenciais padrão
3. Será redirecionado ao Dashboard

### 2. Cadastrar Pessoa

1. Menu lateral: "Pessoas"
2. Botão: "+ Nova Pessoa"
3. Preencha nome e descrição
4. Upload de fotos (recomendado: 3-5 fotos diferentes ângulos)
5. Salvar

**Importante**: Quanto mais fotos, melhor a precisão!

### 3. Reconhecer Rosto

1. Menu lateral: "Reconhecimento"
2. Escolha método:
   - **Upload**: Envie arquivo de imagem
   - **Webcam**: Capture ao vivo
3. Sistema processa e retorna resultado

### 4. Ver Resultados

- **Dashboard**: Estatísticas gerais
- **Pessoas**: Lista de cadastrados
- **Reconhecimento**: Histórico de logs

## 🐛 Troubleshooting

### Backend não inicia

```bash
# Verificar logs
docker compose logs backend

# Reconstruir imagem
docker compose up -d --build backend
```

### Erro "No face detected"

- Certifique-se que a foto tem um rosto visível
- Foto deve estar bem iluminada
- Rosto deve estar frontal

### Baixa precisão

- Adicione mais fotos da pessoa (diferentes ângulos)
- Use fotos com boa qualidade
- Iluminação adequada

### Containers não sobem

```bash
# Limpar tudo e recomeçar
docker compose down -v
docker compose up -d --build
```

## 🔒 Segurança

- Senhas hasheadas com bcrypt
- JWT tokens para autenticação
- CORS configurado
- SQL injection protegido (queries parametrizadas)
- Validação de inputs com Pydantic

## 📊 Performance

- **Reconhecimento**: ~1-2s por imagem
- **Threshold**: 0.6 (60% similaridade)
- **Dimensões**: 512D vectors (Facenet512)
- **Detector**: OpenCV (mais rápido)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Pedro Szpak**
- GitHub: [@PeSzpak](https://github.com/PeSzpak)

## 🙏 Agradecimentos

- [DeepFace](https://github.com/serengil/deepface) - Framework de reconhecimento facial
- [Qdrant](https://qdrant.tech/) - Vector database
- [FastAPI](https://fastapi.tiangolo.com/) - Framework web Python
