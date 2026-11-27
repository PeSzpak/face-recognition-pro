# Face Recognition Pro

Reconhecimento facial self-hosted: cadastre pessoas com algumas fotos e identifique-as pela câmera em tempo real, por upload ou no login por Face ID. Tudo roda na sua máquina. Nenhuma imagem sai para serviços externos.

![Login por Face ID, reconhecimento ao vivo, painel e histórico](docs/media/demo.gif)

| Reconhecimento ao vivo | Painel | Login por Face ID |
| --- | --- | --- |
| ![Câmera identificando um rosto com 99% de similaridade](docs/media/recognize.webp) | ![Painel com KPIs, reconhecimentos por dia e atividade recente](docs/media/dashboard.webp) | ![Tela de login com a aba Face ID](docs/media/face-id-login.webp) |

<sub>Todos os rostos das imagens são sintéticos, gerados para a demonstração.</sub>

**Stack:** FastAPI · DeepFace (RetinaFace + Facenet512) · Qdrant · PostgreSQL · React 18 · TypeScript · Tailwind · React Query

## Funcionalidades

- **Reconhecimento ao vivo.** A câmera identifica todos os rostos do quadro algumas vezes por segundo e desenha caixas com nome e similaridade. A prévia não polui o histórico. O botão "Capturar e registrar" grava o evento.
- **Reconhecimento por upload.** Aceita vários rostos por foto. Para cada rosto, mostra os candidatos ranqueados contra o limiar.
- **Cadastro com controle de qualidade.** Fotos sem rosto, com mais de uma pessoa, borradas ou escuras são recusadas com o motivo. Um rosto que já pertence a outra pessoa também é recusado, o que evita cadastro duplicado.
- **Face ID.** O operador cadastra o próprio rosto em Configurações e passa a entrar olhando para a câmera. O login usa um limiar mais rígido do que a identificação comum.
- **Painel.** KPIs, resultados por dia, horários de pico e pessoas mais reconhecidas, tudo no fuso de quem acessa.
- **Histórico auditável.** Cada reconhecimento e cada tentativa de Face ID (aceita, negada ou desconhecida) fica registrada, com filtros.

## Como funciona

```mermaid
flowchart LR
    UI[React SPA] -->|/api| NGINX[nginx]
    NGINX --> API[FastAPI]
    API -->|detecção + embedding| DF[DeepFace<br/>RetinaFace + Facenet512]
    API -->|vetores 512D, cosseno| QD[(Qdrant)]
    API -->|pessoas, fotos, eventos| PG[(PostgreSQL)]
```

1. **Detecção e embedding em uma passada.** Uma única chamada a `DeepFace.represent` encontra os rostos com RetinaFace, alinha e gera um vetor de 512 dimensões com Facenet512.
2. **Busca vetorial.** Cada foto cadastrada é um ponto no Qdrant, com id igual ao da linha em `face_samples`. A busca traz os vizinhos mais próximos por cosseno.
3. **Ranqueamento por pessoa.** Os acertos são agrupados por pessoa, e a nota de cada uma é a da sua melhor foto (`app/face/matching.py`). A pessoa só é identificada se passar do limiar.
4. **Auditoria.** Cada rosto analisado vira um evento em `recognition_events`.

### Login por Face ID

```mermaid
sequenceDiagram
    participant B as Navegador
    participant A as FastAPI
    participant D as DeepFace
    participant Q as Qdrant
    participant P as PostgreSQL
    B->>A: POST /api/auth/face-login (foto da câmera)
    A->>D: detectar + embedding (usa o maior rosto do quadro)
    D-->>A: vetor 512D
    A->>Q: vizinhos mais próximos por cosseno
    Q-->>A: amostras + similaridade
    A->>A: agrupa por pessoa, aplica limiar 0,78
    A->>P: usuário vinculado à pessoa e ativo?
    A->>P: grava evento (identified / unknown / denied / no_face)
    A-->>B: 200 JWT  ou  401 / 403 / 422
```

Só entra quem tem acesso por Face ID liberado na página da pessoa (`PUT /api/persons/{id}/face-access`). Isso cria uma conta só-rosto, que não aceita senha.

### Modelo de dados

```mermaid
erDiagram
    persons ||--o{ face_samples : "fotos de cadastro"
    persons ||--o| users : "acesso por Face ID"
    persons ||--o{ recognition_events : "identificada em"
    persons {
        uuid id PK
        varchar name
        varchar email
        varchar department
        varchar position
        varchar external_id
        bool active
    }
    users {
        uuid id PK
        varchar username UK
        varchar email UK
        text hashed_password
        uuid person_id FK "único, nulo para o admin"
        bool password_login "false = só Face ID"
        bool is_active
    }
    face_samples {
        uuid id PK "= id do ponto no Qdrant"
        uuid person_id FK
        text file_name
        real quality
        int width
        int height
    }
    recognition_events {
        uuid id PK
        varchar source "upload, camera, face_login"
        varchar status "identified, unknown, no_face, denied"
        uuid person_id FK
        real confidence
        int faces_count
        int processing_ms
    }
```

O Qdrant guarda um vetor por linha de `face_samples`, com o mesmo id e o `person_id` no payload. O schema completo está em [`backend/app/schema.sql`](backend/app/schema.sql).

### Decisões de projeto

| Decisão | Motivo |
| --- | --- |
| Limiar de **0,70** de similaridade (0,78 no Face ID) | Equivale à distância de cosseno 0,30 que o próprio DeepFace usa para Facenet512. A versão anterior usava 0,60 e aceitava falsos positivos. |
| `face_samples.id` = id do ponto no Qdrant | Apagar uma foto remove exatamente o vetor dela. A contagem de fotos sai de um `COUNT`, então não fica dessincronizada. |
| Schema aplicado no boot, de forma idempotente | `docker compose up` em banco vazio ou antigo chega ao mesmo estado, sem passo manual de migração. |
| Modelos carregam em thread separada | A API sobe na hora. Login e cadastro funcionam enquanto os pesos baixam, e o painel mostra o status. |
| Chamadas ao modelo serializadas por lock | Os modelos Keras não são seguros para uso concorrente entre threads de request. |

## Rodando

Pré-requisito: Docker. Recomenda-se reservar uns 6 GB de RAM para o Docker por causa do TensorFlow.

```bash
git clone https://github.com/PeSzpak/face-recognition-pro.git
cd face-recognition-pro
docker compose up -d --build
```

Acesse **http://localhost:8080** e entre com `admin` / `admin123`. No primeiro boot, os pesos dos modelos (~210 MB) são baixados para um volume. O indicador no canto inferior da barra lateral fica verde quando terminam.

| Serviço | URL |
| --- | --- |
| Aplicação | http://localhost:8080 |
| API (Swagger UI) | http://localhost:8000/docs |
| API (ReDoc) | http://localhost:8000/redoc |
| Qdrant | http://localhost:6333/dashboard |

### Desenvolvimento local

```bash
docker compose up -d postgres qdrant

cd backend
python3.10 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload

cd ../frontend
npm install
npm run dev          # http://localhost:5173, com proxy de /api para :8000
```

### Testes

```bash
cd backend && pytest
```

Os testes unitários cobrem o ranqueamento e o tratamento de imagem. Os de integração exercitam a API contra PostgreSQL e Qdrant reais, com um modelo facial falso e determinístico: cadastro, rejeição de rosto duplicado, identificação, exclusão, login por Face ID e estatísticas. Eles usam um banco `face_recognition_test` separado e são pulados se o Postgres não estiver acessível.

## API

O FastAPI gera a especificação OpenAPI 3.1 a partir das rotas e dos modelos Pydantic. Com a API no ar:

- **Swagger UI:** http://localhost:8000/docs. Chame `POST /api/auth/login` com `admin` / `admin123`, copie o `access_token`, clique em **Authorize** e cole o token.
- **ReDoc:** http://localhost:8000/redoc, para leitura.
- **Spec offline:** [`docs/openapi.json`](docs/openapi.json), no repositório, para ler sem subir nada.
- **Postman:** importe [`docs/postman/face-recognition-pro.postman_collection.json`](docs/postman/face-recognition-pro.postman_collection.json) (File > Import). A variável `baseUrl` aponta para `http://localhost:8000`. Rode **auth > Login** primeiro: um script grava o JWT na variável `token`, que as demais requisições usam como Bearer. Nas rotas de upload, escolha o arquivo no campo `image` ou `images`.

| Grupo | Rotas |
| --- | --- |
| `auth` | login por senha e por rosto, `me`, troca de senha, cadastro e remoção do Face ID do operador |
| `persons` | CRUD de pessoas, fotos de cadastro (upload, listagem, imagem, exclusão), liberar e revogar Face ID |
| `recognition` | `POST /identify` (multipart, vários rostos por foto; `record=false` não grava evento) e o histórico paginado com filtros |
| `stats` | visão geral do painel (`days`, `tz`) e status do modelo |
| — | `GET /health`, sem autenticação |

Erros de negócio voltam como `{"code": "...", "detail": "..."}` com o status HTTP correspondente (400, 401, 403, 404, 413, 422, 503). Esses códigos não aparecem na spec, que só lista a resposta de sucesso e o 422 de validação.

Depois de mudar uma rota, regenere a spec e a coleção (não conecta em banco nem no Qdrant, e não carrega o TensorFlow):

```bash
cd backend && source .venv/bin/activate
python scripts/export_openapi.py
```

## Configuração

Variáveis do backend (veja `backend/.env.example`). No Docker, o `docker-compose.yml` define as de conexão; `SECRET_KEY`, `ADMIN_PASSWORD` e `FACE_DETECTOR` podem vir do ambiente do shell.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://admin:admin123@localhost:5433/face_recognition` | Conexão com o PostgreSQL. |
| `QDRANT_HOST` / `QDRANT_PORT` | `localhost` / `6333` | Onde está o Qdrant. |
| `ACCESS_TOKEN_TTL_MINUTES` | `720` | Validade do JWT. |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` | `admin@facerecognition.pro` / `admin` | Admin criado no primeiro boot. |
| `FACE_MODEL` | `Facenet512` | Modelo de embedding do DeepFace. Trocar exige recadastrar as fotos, porque o tamanho do vetor muda. |
| `FACE_DETECTOR` | `retinaface` | Detector do DeepFace. `opencv` é mais rápido e menos preciso. |
| `MATCH_THRESHOLD` | `0.70` | Similaridade mínima para identificar alguém. |
| `FACE_LOGIN_THRESHOLD` | `0.78` | Similaridade mínima para o login por Face ID. |
| `MIN_SAMPLE_QUALITY` | `0.35` | Qualidade mínima de uma foto de cadastro (nitidez, exposição, tamanho). |
| `SECRET_KEY` | valor de demo | Chave de assinatura dos JWT. **Troque em qualquer ambiente real.** |
| `ADMIN_PASSWORD` | `admin123` | Senha do admin criado no primeiro boot. Não sobrescreve uma senha já existente. |
| `MEDIA_DIR` | `./media` | Onde as fotos de cadastro são gravadas (volume `media` no Docker). |

O frontend tem uma única variável, `VITE_API_URL` (`frontend/.env.example`). Vazia, ele chama a API na mesma origem: proxy do Vite em dev, nginx no Docker.

## Estrutura

```
backend/            FastAPI, testes (pytest), scripts/export_openapi.py
frontend/           React + Vite, servido por nginx no Docker
docs/               openapi.json, coleção Postman, imagens do README
docker-compose.yml  postgres, qdrant, backend, frontend
```

```
backend/app/
  face/engine.py      DeepFace: detecção + embedding, warmup, lock
  face/matching.py    ranqueamento puro, sem I/O
  face/pipeline.py    cadastro e identificação
  api/                rotas: auth, persons, recognition, stats
  schema.sql          schema idempotente
frontend/src/
  pages/              uma tela por rota
  features/           modais de cadastro de pessoa e de fotos
  components/         Camera, FaceOverlay, AppShell e o kit de UI
  lib/                cliente da API, sessão, tipos
```

## Limitações conhecidas

- **Sem prova de vida.** Uma foto impressa ou exibida numa tela pode passar no Face ID. O DeepFace oferece anti-spoofing (FasNet), mas ele exige PyTorch, o que dobraria o tamanho da imagem. É o próximo passo natural.
- **CPU.** Cerca de 1 s por imagem em um Mac M-series. Com GPU, ou trocando o detector para `opencv`, a latência cai bastante.
- **Dados biométricos.** Rostos são dados pessoais sensíveis pela LGPD. Em produção, colete consentimento explícito, defina retenção e restrinja o acesso.

## Licença

MIT. Veja [LICENSE](LICENSE).
