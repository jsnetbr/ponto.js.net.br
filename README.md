# ponto.js.net.br

Aplicativo web de controle de ponto com React + Firebase (Auth Google + Firestore).

## Requisitos

- Node.js 20+
- Projeto Firebase configurado (Auth Google habilitado + Firestore)
- Firebase CLI autenticado (`firebase login`)

## Executar localmente

1. Instalar dependências:
   ```bash
   npm install
   ```
2. Iniciar app:
   ```bash
   npm run dev
   ```
3. Abrir no navegador:
   - `http://localhost:3000`

## Verificação de qualidade

- Checagem de tipos da aplicação:
  ```bash
  npm run typecheck
  ```
- Testes unitários utilitários:
  ```bash
  npm run test:unit
  ```
- Testes de regras do Firestore (com emulador):
  ```bash
  npm run test:rules
  ```
- Build de produção:
  ```bash
  npm run build
  ```
- Pipeline local completo:
  ```bash
  npm test
  ```

## Critérios para considerar o projeto “sólido”

- `npm run lint` sem erros.
- `npm run test:unit` com 100% de sucesso.
- `npm run build` concluído.
- `npm run test:rules` concluído com emulador Firestore.
- CI no GitHub Actions (`.github/workflows/ci.yml`) verde em `push`/`pull_request`.

## Deploy de regras e índices Firestore

1. Confirmar projeto no arquivo `.firebaserc`.
2. Publicar regras e índices:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## Estrutura de dados Firestore

- `users/{userId}`
  - `email` (string)
  - `createdAt` (timestamp)
- `userSettings/{userId}`
  - `userId` (string)
  - `expectedMinutes` (int entre 1 e 1440)
  - `requireLocation` (boolean)
  - `updatedAt` (timestamp)
- `users/{userId}/punches/{punchId}`
  - `userId` (string)
  - `timestamp` (timestamp)
  - `type` (`in` ou `out`)
