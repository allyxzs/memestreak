# Validação da versão 1.1.0

Entrega preparada em 24 de novembro de 2026, baseada no commit `496abb0c87e7de6bbc6b8b9e111bc7ee7b9d8503`.

O job `138079783201` da execução `45285250161` falhou no passo `npm run typecheck`. As anotações do GitHub registraram imports não encontrados de `@/lib/store` e `@/lib/engine`, seguidos de erros de tipos derivados. A comparação com o ZIP original identificou dez arquivos ausentes. Todos foram restaurados sem alterar os arquivos enviados pelo usuário além das mudanças de versão e da verificação de estrutura.

A validação abaixo foi executada após `npm ci`, em uma cópia nova, sem cache de compilação `.next` da versão anterior. O GitHub Actions remoto só executará a versão nova após ela ser enviada ao repositório.

| Verificação                  | Resultado                                              |
| ---------------------------- | ------------------------------------------------------ |
| TypeScript estrito           | Aprovado com `npm run typecheck`                       |
| Motor de hábitos e validação | 12 testes aprovados com `npm test`                     |
| Interface em DOM simulado    | 8 testes aprovados com `npm run test:ui`               |
| Compilação de produção       | Aprovada com `npm run build`                           |
| Playwright desktop/mobile    | Suíte incluída, sem validação concluída neste ambiente |
| Inspeção visual em navegador | Não concluída neste ambiente                           |

## Escopo dos testes de interface

Cadastro, conclusão, persistência após remontagem, pular e desfazer, favoritos, detecção de quebra ao retornar, não repetição de eventos vistos, modo sem julgamento, preservação de dados inválidos, criação/votação/exclusão de memes, confirmação de restauração de backup e falha de armazenamento sem falso sucesso.

## Limitação de navegador

Nesta entrega, a tentativa com o Chromium instalado foi impedida pela restrição de sockets do ambiente (`socket() failed: Operation not permitted`) antes de qualquer cenário de interface ser executado. Isso não equivale a uma aprovação ou reprovação funcional dos quatro cenários E2E.

Os testes em DOM simulado validam comportamento, mas não layout real, toque, CSS ou compatibilidade entre navegadores. A suíte Playwright está configurada para desktop e celular e também está incluída no workflow de CI, para execução em um ambiente com navegador disponível.
