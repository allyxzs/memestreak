# Memestreak-1.1

## 1.1.0 — 24/11/2026

- Restaurados os dez arquivos ausentes no commit `496abb0` do repositório: os três módulos de `lib/`, o ícone, o banner, as configurações Next.js/Playwright, as declarações Next.js e os testes do motor e E2E.
- Corrigida a causa dos erros de importação de `@/lib/engine`, `@/lib/store` e `@/lib/utils`, sem desativar a tipagem estrita.
- Adicionada checagem de integridade da estrutura antes da análise TypeScript, com lista legível de arquivos ausentes.
- A análise de tipos gera as declarações do Next.js antes do `tsc`, para funcionar em uma instalação limpa.
- Versão atualizada na interface, README, package.json e lockfile.

Os hábitos e backups da versão 1.0 continuam compatíveis. O formato de dados e a chave `memestreak:v1` foram preservados.
