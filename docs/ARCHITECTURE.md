# Decisões de arquitetura

## MVP local

A primeira versão prioriza um fluxo completo, sem contas ou infraestrutura obrigatória. A interface React consome funções puras do motor; o estado versionado é validado por Zod quando lido ou importado. A gravação acontece antes da atualização visual: uma falha de armazenamento produz um aviso em vez de simular sucesso.

O componente principal coordena as cinco telas. Botões e diálogos possuem arquivos próprios. O motor não depende de React, rede ou APIs do navegador, facilitando testes e posterior migração.

## Modelo de dados

| Entidade | Campos principais                                                                              |
| -------- | ---------------------------------------------------------------------------------------------- |
| Hábito   | ID, nome, emoji, dias da semana, meta, data de criação, estado de arquivo, intervalos de pausa |
| Registro | Chave local `YYYY-MM-DD` e estado `done` ou `skipped`, dentro do hábito                        |
| Meme     | ID, texto superior/inferior, categoria, tom, emoji e imagem data URL opcional                  |
| Estado   | Versão, hábitos, memes pessoais, favoritos, votos, quebras vistas e preferência sem julgamento |

O registro é um mapa por data, evitando duplicação. Domingos são 0 e sábados 6. Datas são manipuladas ao meio-dia local para evitar conversões UTC e mudanças de data durante transições comuns de horário de verão. O backup aceita datas válidas entre 2000 e 2100.

Arquivar abre um intervalo sem oportunidades. Se hoje já tem registro, a pausa começa amanhã; caso contrário, começa hoje. Desarquivar encerra o intervalo ontem e permite retomar hoje. Isso preserva o histórico sem penalizar dias arquivados.

## Memes e quebras

Um trecho contínuo de dias não cumpridos gera uma quebra apenas quando vem depois de ao menos uma conclusão. Eventos usam `habitId:date`. Ao detectar várias quebras não vistas, a interface salva todos os eventos como vistos e mostra apenas um meme, evitando uma fila de diálogos no retorno. Pular manualmente também oferece um meme mesmo sem sequência anterior.

O sorteio usa `Math.random`, adequado para humor sem qualquer função de segurança. O meme do dia usa a data local para escolher um item do catálogo. Não há chamadas a APIs de imagens.

## Persistência e recuperação

`localStorage` recebe um snapshot JSON. A interface mantém os dados anteriores se a gravação falhar. O evento `storage` atualiza outras abas; não há bloqueio distribuído ou merge de operações simultâneas. O último snapshot gravado vence.

Ao encontrar estado inválido, o app bloqueia novas alterações e preserva o texto original. A exportação continua disponível; uma importação válida pode recuperá-lo. Importar exige confirmação explícita de substituição e rejeita datas futuras. Imagens aceitas são PNG, JPEG ou WebP; SVG e URLs arbitrárias não são aceitos. Textos são renderizados por React sem HTML bruto.

## Evolução para Supabase

O backend permanece planejado, não simulado. Uma próxima entrega deve criar tabelas `habits`, `habit_logs`, `habit_pauses`, `memes`, `meme_votes`, `meme_favorites` e `profiles`, com `user_id` e isolamento por RLS. Registros precisam de unicidade por hábito/data, e votos/favoritos por usuário/meme. Arquivos devem usar Storage com validação de tamanho/tipo, políticas de acesso e moderação para conteúdo público.

A migração precisa oferecer autenticação, importação explícita do estado local, fuso de perfil e estratégia de conflitos. Não colocar chaves privilegiadas no frontend. Sem essas etapas, o MVP não deve ser apresentado como um serviço multiusuário.
