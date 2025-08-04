# Face Recognition Pro

## Descrição do Projeto
O **Face Recognition Pro** é um sistema completo de reconhecimento facial desenvolvido com FastAPI, InsightFace, Pinecone e Supabase. O objetivo do projeto é fornecer uma aplicação web moderna e escalável para cadastro e reconhecimento facial em tempo real, utilizando as melhores práticas de desenvolvimento.

## Tecnologias Utilizadas
- **Backend**: FastAPI + Python 3.8+
- **IA Engine**: DeepFace (modelos: VGG-Face, Facenet, ArcFace) + OpenCV
- **Banco Vetorial**: Pinecone (plano gratuito)
- **Banco Relacional**: Supabase PostgreSQL
- **Frontend**: React com TypeScript
- **Autenticação**: JWT + Supabase Auth
- **Upload de Imagens**: Cloudinary ou armazenamento local

## Funcionalidades
1. **Cadastro de Pessoas**: Permite o upload de múltiplas fotos e processamento automático.
2. **Reconhecimento Facial**: Suporta upload de fotos ou captura via webcam, com resultados em tempo real.
3. **Gestão de Pessoas**: CRUD completo para gerenciamento de registros de pessoas.
4. **Dashboard**: Interface administrativa moderna com estatísticas e logs de reconhecimento.

## Estrutura do Projeto
```
face-recognition-pro/
├── backend/
│   ├── app/
│   ├── models/
│   ├── uploads/
│   ├── requirements.txt
│   ├── .env
│   └── run.py
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Como Executar o Projeto

### Backend
1. Navegue até o diretório `backend`.
2. Instale as dependências:
   ```
   pip install -r requirements.txt
   ```
3. Configure as variáveis de ambiente no arquivo `.env`.
4. Execute a aplicação:
   ```
   uvicorn app.main:app --reload
   ```

### Frontend
1. Navegue até o diretório `frontend`.
2. Instale as dependências:
   ```
   npm install
   ```
3. Execute a aplicação:
   ```
   npm start
   ```

## Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença
Este projeto está licenciado sob a MIT License. Veja o arquivo LICENSE para mais detalhes.