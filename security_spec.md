# Security Spec: ponto.js.net.br

## Access policy

- Somente usuarios autenticados e com `email_verified == true` podem acessar dados.
- Cada usuario acessa apenas os proprios documentos:
  - `users/{userId}`
  - `userSettings/{userId}`
  - `users/{userId}/punches/{punchId}`

## Collection rules

### `users/{userId}`

- Permite:
  - `get` do proprio documento
  - `create` apenas com schema exato:
    - `email` (string, 1..200)
    - `createdAt` (`request.time`)
- Nao permite:
  - `list`
  - `update`
  - `delete`

### `userSettings/{userId}`

- Permite:
  - `get/list` apenas do proprio usuario
  - `create/update` com schema exato:
    - `userId` (igual ao `uid`)
    - `expectedMinutes` (int entre 1 e 1440)
    - `requireLocation` (bool)
    - `updatedAt` (`request.time`)
- Em `update`, apenas estes campos podem mudar:
  - `expectedMinutes`
  - `requireLocation`
  - `updatedAt`
- Nao permite:
  - `delete`

### `users/{userId}/punches/{punchId}`

- Permite:
  - `get/list` do proprio usuario
  - `create` com schema exato:
    - `userId` (igual ao `uid`)
    - `timestamp` (`request.time`)
    - `type` (`in` ou `out`)
  - `update` apenas de `timestamp`
  - `delete` do proprio usuario
- Bloqueia:
  - mudanca de `userId`
  - mudanca de `type`
  - campos extras

## Negative tests (must fail)

- Leitura sem autenticacao.
- Usuario A tentando ler/escrever dados do usuario B.
- Campo extra malicioso (`isAdmin`, `location`, etc.).
- Tipo invalido (`expectedMinutes` string, `type` fora de `in/out`).
- Usuario sem e-mail verificado.

## Positive tests (must pass)

- Criacao valida de `users`.
- Criacao e atualizacao valida de `userSettings`.
- Criacao, edicao de `timestamp` e exclusao de `punches` pelo dono.
