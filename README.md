# Filhos do Eden - Módulo para Foundry VTT

Módulo de suporte ao cenário Filhos do Eden para Foundry VTT, com ficha e automações do sistema.

## Compatibilidade

- Foundry VTT: 12 ou superior
- Versão verificada: 13
- Sistema obrigatório: dnd5e

## Instalação (recomendada) - Pelo Foundry com URL de Manifest

Este é o jeito mais simples para instalar e receber atualizações.

1. Abra o Foundry VTT.
2. Na tela inicial, entre em Add-on Modules (ou Módulos).
3. Clique em Install Module (ou Instalar Módulo).
4. Cole a URL de manifesto abaixo no campo Manifest URL:

https://github.com/azevedosadraque/filhos-do-eden/releases/latest/download/module.json

5. Clique em Install.
6. Abra seu mundo.
7. Vá em Manage Modules e ative Filhos do Eden.

## Instalação Manual (offline ou sem URL)

Use este método se você preferir instalar por arquivo zip.

1. Baixe o arquivo zip da versão desejada em Releases:

https://github.com/azevedosadraque/filhos-do-eden/releases

2. Extraia o conteúdo do zip para a pasta de módulos do Foundry, mantendo a estrutura do módulo.
3. O resultado final deve ficar assim:

Data/modules/filhos-do-eden/module.json

4. Reinicie o Foundry VTT.
5. No mundo, acesse Manage Modules e ative Filhos do Eden.

## Como Atualizar

### Se instalou por Manifest URL

1. Abra Add-on Modules.
2. Encontre Filhos do Eden na lista.
3. Clique em Update (quando disponível).
4. Reinicie o mundo após atualizar.

### Se instalou manualmente

1. Faça backup da pasta do módulo atual.
2. Baixe a nova versão em Releases.
3. Substitua os arquivos da pasta Data/modules/filhos-do-eden.
4. Reinicie o Foundry VTT.

## Verificação Rápida Pós-instalação

1. O módulo aparece em Manage Modules.
2. O módulo pode ser ativado sem erro.
3. A ficha abre com a aba Filhos do Eden.
4. O idioma pt-BR carrega normalmente.

## Solução de Problemas

### O Foundry não instala pela URL

- Verifique se a URL do manifest está exatamente assim:
  https://github.com/azevedosadraque/filhos-do-eden/releases/latest/download/module.json
- Confirme conexão com internet e acesso ao GitHub.
- Confirme se existe uma Release publicada com os assets corretos.

### O módulo não aparece na lista

- Confirme se a pasta do módulo está em Data/modules/filhos-do-eden.
- Confirme se o arquivo module.json existe dentro dessa pasta.
- Reinicie o Foundry após copiar arquivos manualmente.

### Erro de compatibilidade

- Verifique se você está em Foundry 12+.
- Verifique se o sistema dnd5e está instalado e atualizado.

## Estrutura mínima esperada do pacote

Ao empacotar ou validar a instalação manual, estes itens devem existir na raiz do módulo:

- module.json
- scripts/
- styles/
- templates/
- lang/

## Suporte

- Repositório: https://github.com/azevedosadraque/filhos-do-eden
- Issues: https://github.com/azevedosadraque/filhos-do-eden/issues

Se encontrar um bug, abra uma issue com:

1. Versão do Foundry
2. Versão do módulo
3. Passo a passo para reproduzir
4. Mensagens de erro (se houver)
