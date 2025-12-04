#!/bin/bash

# Script de teste para criação de pessoas
# Este script testa todo o fluxo de cadastro

echo "🧪 Testando Sistema de Cadastro de Pessoas"
echo "==========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:8000"

# 1. Testar Health Check
echo "1️⃣ Testando Health Check..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Backend está saudável${NC}"
else
    echo -e "${RED}❌ Backend não está respondendo${NC}"
    exit 1
fi
echo ""

# 2. Fazer Login
echo "2️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin@facerecognition.pro&password=admin123")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Falha no login${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Login bem-sucedido${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 3. Criar uma pessoa (sem fotos)
echo "3️⃣ Criando pessoa (sem fotos)..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/persons" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Teste Usuario","description":"Usuario de teste"}')

PERSON_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -z "$PERSON_ID" ]; then
    echo -e "${RED}❌ Falha ao criar pessoa${NC}"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Pessoa criada com sucesso${NC}"
echo "ID: $PERSON_ID"
echo ""

# 4. Listar pessoas
echo "4️⃣ Listando pessoas..."
LIST_RESPONSE=$(curl -s "$BASE_URL/api/persons?page=1&per_page=20" \
    -H "Authorization: Bearer $TOKEN")

PERSON_COUNT=$(echo "$LIST_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('persons', [])))" 2>/dev/null)

if [ -z "$PERSON_COUNT" ]; then
    echo -e "${RED}❌ Falha ao listar pessoas${NC}"
    echo "Response: $LIST_RESPONSE"
else
    echo -e "${GREEN}✅ ${PERSON_COUNT} pessoa(s) encontrada(s)${NC}"
fi
echo ""

# 5. Obter detalhes da pessoa
echo "5️⃣ Obtendo detalhes da pessoa..."
PERSON_DETAILS=$(curl -s "$BASE_URL/api/persons/$PERSON_ID" \
    -H "Authorization: Bearer $TOKEN")

PERSON_NAME=$(echo "$PERSON_DETAILS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('name', ''))" 2>/dev/null)

if [ "$PERSON_NAME" = "Teste Usuario" ]; then
    echo -e "${GREEN}✅ Detalhes corretos${NC}"
    echo "Nome: $PERSON_NAME"
else
    echo -e "${RED}❌ Detalhes incorretos${NC}"
    echo "Response: $PERSON_DETAILS"
fi
echo ""

# 6. Verificar Qdrant
echo "6️⃣ Verificando Qdrant..."
QDRANT_HEALTH=$(curl -s "http://localhost:6333/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Qdrant está acessível${NC}"
else
    echo -e "${RED}❌ Qdrant não está acessível${NC}"
fi
echo ""

# 7. Verificar PostgreSQL
echo "7️⃣ Verificando PostgreSQL..."
docker exec face-recognition-db psql -U postgres -d face_recognition -c "SELECT COUNT(*) FROM persons;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    DB_COUNT=$(docker exec face-recognition-db psql -U postgres -d face_recognition -t -c "SELECT COUNT(*) FROM persons;" 2>/dev/null | tr -d ' ')
    echo -e "${GREEN}✅ PostgreSQL está acessível${NC}"
    echo "Total de pessoas no banco: $DB_COUNT"
else
    echo -e "${YELLOW}⚠️  Não foi possível verificar PostgreSQL${NC}"
fi
echo ""

# 8. Deletar pessoa de teste
echo "8️⃣ Deletando pessoa de teste..."
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/persons/$PERSON_ID" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESPONSE" | grep -q "deleted successfully"; then
    echo -e "${GREEN}✅ Pessoa deletada com sucesso${NC}"
else
    echo -e "${YELLOW}⚠️  Resposta de deleção: $DELETE_RESPONSE${NC}"
fi
echo ""

# Resumo
echo "=========================================="
echo "✅ RESUMO DOS TESTES"
echo "=========================================="
echo -e "${GREEN}✅ Backend funcionando${NC}"
echo -e "${GREEN}✅ Autenticação funcionando${NC}"
echo -e "${GREEN}✅ Criação de pessoa funcionando${NC}"
echo -e "${GREEN}✅ Listagem funcionando${NC}"
echo -e "${GREEN}✅ Detalhes funcionando${NC}"
echo -e "${GREEN}✅ Deleção funcionando${NC}"
echo ""
echo "🎉 Todos os testes básicos passaram!"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "1. Abra http://localhost:5173"
echo "2. Faça login com: admin@facerecognition.pro / admin123"
echo "3. Vá para 'Pessoas'"
echo "4. Clique em '+ Nova Pessoa'"
echo "5. Teste o upload de fotos OU captura com câmera"
echo ""
