#!/usr/bin/env bash

set -e

echo "Instalando dependências..."
npm ci --registry=https://registry.npmjs.org

echo "Iniciando o Comunhão..."
npm run dev -- --host
