# 🤖 Bot de Negociação de Criptomoedas - Binance Testnet

[![Node.js](https://img.shields.io/badge/node.js-18.0+-green?logo=node.js)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-ativo-brightgreen)]()

Este é um **bot de trading com criptomoedas** que opera com o par **BTC/USDT** na plataforma **Binance**, utilizando o ambiente de **homologação/testes** (_Testnet_). Ideal para quem deseja **simular negociações** com segurança antes de partir para o ambiente real.

---

## 📦 Descrição do Projeto

O bot monitora o preço do Bitcoin a cada 3 segundos e executa ordens de **compra** ou **venda** automaticamente com base em **três estratégias pré definidas**:

1. **Comparação de preço fixo**: compra se o valor estiver abaixo de um limite definido e vende se estiver acima;
2. **Médias móveis (SMA)**: compara a média de curto e longo prazo para detectar cruzamentos;
3. **Margem sobre a média**: compra se o preço estiver muito abaixo da média, e vende se estiver muito acima.

> Sinta-se livre para testar qualquer uma das estratégias ou implementar a sua própria.
> Você pode ativar/desativar as estratégias diretamente no código, comentando ou descomentando as linhas dentro da função `start()`.

Tecnologias utilizadas:

- 🟨 **Node.js** para execução do código JavaScript
- 🔐 `dotenv` para armazenar as chaves de API com segurança
- 🔐 `crypto` para assinar requisições com SHA256
- 🌐 `axios` para se comunicar com a API da Binance

O uso é bem simples:

1. Clone o repositório e instale as dependências com `npm install`;
2. Crie um arquivo `.env` com sua `API_KEY` e `SECRET_KEY` da Binance Testnet;
3. Execute com `node index.js` e o bot começará a monitorar o preço e agir automaticamente.

Exemplo de saída no terminal:

================
Price: 105786.55
aguardar
================
Price: 105782.11
comprar
=====SUCESSO====
{
  ...
}



> ⚠️ **Atenção:** Este projeto é apenas para **fins educacionais e testes**.  
> Não utilize em conta real sem entender os riscos envolvidos. O autor **não se responsabiliza** por prejuízos financeiros causados pelo uso deste código.

Caso queira contribuir, você pode:

- 💡 Sugerir novas estratégias de trading
- 🐞 Corrigir bugs ou melhorar a performance
- 🧪 Criar Pull Requests com testes e melhorias

---

## 🔬 Ambiente de Testes (Testnet)

Este bot está configurado para usar o ambiente de **testes da Binance**, com a URL:
👉 https://testnet.binance.vision

Você pode criar uma conta de teste e gerar suas chaves no mesmo link acima.