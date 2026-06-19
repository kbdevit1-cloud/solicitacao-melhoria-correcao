# Política de Segurança

## Versões suportadas

As correções de segurança serão aplicadas preferencialmente na versão mais recente do projeto.

| Versão | Suporte |
|---|---|
| Atual | Sim |
| Antigas | Não garantido |

## Relatando vulnerabilidades

Caso encontre uma falha de segurança, não publique o problema em uma issue pública.

Entre em contato diretamente com o responsável pelo projeto e informe:

- Descrição da falha;
- Como reproduzir o problema;
- Impacto possível;
- Prints ou logs, se necessário;
- Arquivo, tela ou função afetada.

## Dados sensíveis

Não devem ser publicados no repositório:

- Senhas;
- Tokens;
- Chaves de API;
- Dados de usuários;
- E-mails corporativos sensíveis;
- Informações internas da empresa;
- Arquivos de banco de dados real;
- Configurações privadas de ambiente;
- Arquivos `.env`.

## Boas práticas obrigatórias

O projeto deve seguir as seguintes práticas:

- Validar login e permissões sempre que aplicável;
- Não confiar apenas em validações visuais do frontend;
- Não armazenar senhas em texto puro;
- Não expor chaves ou credenciais no código;
- Usar variáveis de ambiente ou arquivos de configuração seguros;
- Validar entradas do usuário;
- Impedir acesso não autorizado a telas internas;
- Manter logs sem dados sensíveis;
- Não publicar banco de dados real no GitHub.

## Correções

Falhas confirmadas devem ser corrigidas com prioridade.

Após a correção, a alteração deve ser testada antes de ser incorporada à versão principal.
