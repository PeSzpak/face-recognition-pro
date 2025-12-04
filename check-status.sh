#!/bin/bash
# Script simples para verificar quando o build completar

echo "🔍 Verificando status do Docker Compose..."
echo ""

while true; do
    clear
    echo "════════════════════════════════════════════════════════"
    echo "  🐳 Status dos Containers - $(date '+%H:%M:%S')"
    echo "════════════════════════════════════════════════════════"
    
    CONTAINERS=$(docker compose ps 2>/dev/null)
    
    if echo "$CONTAINERS" | grep -q "Up"; then
        echo "✅ CONTAINERS RODANDO!"
        echo ""
        docker compose ps
        echo ""
        echo "════════════════════════════════════════════════════════"
        echo "🎉 BUILD COMPLETADO COM SUCESSO!"
        echo ""
        echo "Acesse:"
        echo "  Frontend: http://localhost:5173"
        echo "  Backend:  http://localhost:8000/docs"
        echo ""
        echo "Login: admin@facerecognition.pro / admin123"
        echo "════════════════════════════════════════════════════════"
        break
    else
        echo "⏳ Build ainda em andamento..."
        echo ""
        
        # Verificar se processo ainda está rodando
        if ps aux | grep -q "[d]ocker compose up"; then
            echo "✓ Processo do Docker ativo"
            echo "✓ Aguardando instalação de dependências..."
            echo ""
            echo "Última atividade:"
            tail -3 /tmp/build.log 2>/dev/null | sed 's/^/  /' || echo "  Processando..."
        else
            echo "❌ Processo do Docker não encontrado"
            echo "Execute: docker compose up -d --build"
            break
        fi
    fi
    
    echo ""
    echo "Atualizando em 10 segundos... (Ctrl+C para sair)"
    sleep 10
done
