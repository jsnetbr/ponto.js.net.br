# ponto.js.net.br

Aplicativo web de controle de ponto com React + Firebase (Auth Google + Firestore).

## Requisitos

- Node.js 20+
- Projeto Firebase configurado (Auth Google habilitado + Firestore)
- Firebase CLI autenticado (`firebase login`)

## Executar localmente

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar app:
   ```bash
   npm run dev
   ```
3. Abrir no navegador:
   - `http://localhost:3000`

## Verificacao de qualidade

- Checagem de tipos da aplicacao:
  ```bash
  npm run typecheck
  ```
- Testes de regras do Firestore:
  ```bash
  npm run test:rules
  ```
- Build de producao:
  ```bash
  npm run build
  ```

## Deploy de regras e indices Firestore

1. Confirmar projeto no arquivo `.firebaserc`.
2. Publicar regras e indices:
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
