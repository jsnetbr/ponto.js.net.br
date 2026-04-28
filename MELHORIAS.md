# Melhorias recomendadas para deixar o app mais sólido

## Prioridade alta (1-2 sprints)

1. **Resiliência offline com fila local de batidas**
   - Hoje o botão de ponto é bloqueado sem internet.
   - Melhoria: enfileirar batidas offline no IndexedDB/localStorage e sincronizar ao voltar conexão.
   - Benefício: evita perda de registro real de jornada.

2. **Tratamento robusto de timezone e virada de dia**
   - Há várias regras de agrupamento por `toLocaleDateString('en-CA')`.
   - Melhoria: centralizar normalização de data/hora em utilitário único com testes de DST/fuso.
   - Benefício: elimina inconsistências em histórico/relatórios para usuários que viajam ou mudam fuso.

3. **Guardrails de edição de ponto mais claros na UI**
   - O backend já restringe bem, mas a UI pode prevenir melhor antes de tentar salvar.
   - Melhoria: mostrar validação instantânea no modal de edição (ordem cronológica e mesmo dia), com mensagens específicas.
   - Benefício: menos erro e menos retrabalho do usuário.

4. **Observabilidade de erros (Sentry/LogRocket)**
   - Melhoria: instrumentar erros de runtime, falhas Firebase e eventos críticos (login, punch, edição, exclusão).
   - Benefício: diagnóstico rápido de bugs em produção.

## Prioridade média

5. **Testes E2E do fluxo principal**
   - Cenários: login, bater entrada/saída, editar ponto, exportar CSV.
   - Sugestão: Playwright com mocks do Firebase Emulator.

6. **Acessibilidade (A11y)**
   - Melhorias: foco visível consistente, labels/aria para ícones-botão, navegação por teclado no modal.
   - Benefício: melhor usabilidade e conformidade.

7. **Performance de dados no histórico**
   - Melhoria: paginação por mês + virtualização da lista em históricos grandes.
   - Benefício: renderização estável com muitos registros.

8. **Política de retenção e backup de dados**
   - Melhoria: rotina de exportação mensal e/ou integração com BigQuery para auditoria.
   - Benefício: confiabilidade operacional e compliance.

## Prioridade baixa (valor incremental)

9. **PWA mais completa**
   - Melhorias: estratégia de cache explícita, tela offline e atualização de versão controlada.

10. **Exportações adicionais**
    - PDF assinado, espelho de ponto e AFD com layout oficial.

11. **Feature flags para releases graduais**
    - Melhoria: habilitar funcionalidades por grupo de usuários.

12. **Dashboard de saúde operacional**
    - Melhoria: métricas de erro, latência de gravação e taxa de sucesso de batidas.

---

## Indicadores de sucesso sugeridos

- Taxa de falha ao registrar ponto < **0,5%**.
- Erros de edição por validação reduzidos em **30%**.
- Tempo de abertura do histórico (p95) < **1,5s**.
- 100% do fluxo crítico coberto por E2E.
