require('dotenv').config(); //Carrega as variáveis do .env

const crypto = require("crypto"); //Biblioteca de criptografia nativa do node
const axios = require("axios"); //Biblioteca para conexão via API

const SYMBOL = "BTCUSDT"; //Par que será negociado
const BUY_PRICE = 105783.11; //Preço de compra
const SELL_PRICE = 105800; //Preço de venda
const QUANTITY = "0.0001"; //Quantidade da moeda a ser negociada. Ex: BTC

const API_KEY = process.env.API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

/*
* Spot API URL:
* https://api.binance.com/api
* wss://stream.binance.com.:9443/ws
* wss://stream.binance.com: 9443/stream
*
* Spot Test network URL
* https://testnet.binance.vision/api
* wss://testnet.binance.vision/ws
* wss://testnet.binance.vision/stream
*/
const API_URL = "https://testnet.binance.vision";

let isOpened = false; //variável de controle que determina se já está comprado

async function start(){
    console.log("================");
    const qtdVelas = "21";
    const interval = "15m";
    const {data} = await axios.get(API_URL + "/api/v3/klines?limit="+qtdVelas+"&interval="+interval+"&symbol=" + SYMBOL);
    const candle = data[data.length - 1];
    
    const openVal = candle[1]; //Open
    const highVal = candle[2]; //High
    const lowVal = candle[3]; //Low
    const price = parseFloat(candle[4]); //Close

    console.log("Price: " + price);

    //Estratégia 1
    estrategiaPriceCompare(price);

    //Estratégia 2
    //estrategiaSMA(data);

    //Estratégia 3
    //estrategiaComparePriceSmaMargem(data, price);
}


//Calcula Simple Movement Average (SMA)
function calcSMA(data){
    const closes = data.map(candle => parseFloat(candle[4]));
    const sum = closes.reduce((a,b) => a + b);

    var sma = sum / data.length;
    return sma;
}

function estrategiaPriceCompare(price){
    /*
    * Estratégia 1: Comparação simples de preço
    *
    * Se o preço é menor ou igual ao valor pré definido para compra, então compra
    * Se o preço é maior ou igual ao valor pré definido para venda, então vende
    */
    if(price <= BUY_PRICE && isOpened === false)
    {
        console.log("comprar");
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(price >= SELL_PRICE && isOpened === true)
    {
        console.log("vender");
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else {
        console.log("aguardar");
    }
}

function estrategiaSMA(data){
    /*
    * Estratégia 2: Simple Movement Average (SMA) - Comparação de Médias móveis em tempos de velas diferentes
    *
    * Compra no cruzamento das duas médias:
    * Quando a média mais curta corta a mais longa para cima: alta no curto prazo = Compra
    * Quando a média mais curta corta a mais longa para baixo: queda no curto prazo = Vende
    */
    const sma21 = calcSMA(data);
    const sma12 = calcSMA(data.slice(9));
    console.log("SMA (12): "+sma12);
    console.log("SMA (21): "+sma21);
    console.log("IsOpened:" + isOpened);

    if(sma12 > sma21 && isOpened === false)
    {
        console.log("comprar");
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(sma12 < sma21 && isOpened === true)
    {
        console.log("vender");
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else {
        console.log("aguardar");
    }
}

function estrategiaComparePriceSmaMargem(data, price){
    /*
    * Estratégia 3: Comparação de preço com um percentual da SMA
    * Quando o preço está a um percentual abaixo da média, então compra
    * Quando o preço está a um percentual acima da média, então vende
    */
    const sma = calcSMA(data);
    const percentualCompra = 0.9; //0.9 = 10% abaixo da média
    const percentualVenda = 1.1; //1.1 = 10% acima da média
    const valorCompra = sma * percentualCompra;
    const valorVenda = sma * percentualVenda;
    
    if(price <= valorCompra && isOpened === false)
    {
        console.log("comprar");
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(price >= valorVenda && isOpened === true)
    {
        console.log("vender");
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else {
        console.log("aguardar");
    }
}

async function newOrder(symbol, quantity, side){
    const order = { symbol, quantity, side};
    order.type = "MARKET"; //Tipo de ordem: Mercado
    order.timestamp = Date.now(); //Pega data e hora atual da máquina

    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(new URLSearchParams(order).toString())
        .digest("hex");

    order.signature = signature;

    try{
        const {data} = await axios.post(
            API_URL + "/api/v3/order",
            new URLSearchParams(order).toString(),
            {headers: { "X-MBX-APIKEY": API_KEY } }
        )

        console.log(data);
        if (side == "buy"){
            isOpened = true;
        }
        else if (side == "sell"){
            isOpened = false;
        }
        console.log("=====SUCESSO====");
    }
    catch(err){
        console.warn("======ERRO======");
        console.error(err.response.data);
        isOpened = false;
    }
}

setInterval(start, 3000);

console.clear();
start();