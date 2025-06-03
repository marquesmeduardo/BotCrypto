const axios = require("axios"); //Biblioteca para conexão via API

const SYMBOL = "BTCUSDT";
const BUY_PRICE = 105783.11;
const SELL_PRICE = 105800;

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
    console.log("=============");
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
    estrategiaSMA(data);

    //Estratégia 3
    estrategiaComparePriceSmaMargem(data, price);
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
        isOpened = true;
    }
    else if(price >= SELL_PRICE && isOpened === true)
    {
        console.log("vender");
        isOpened = false;
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
        isOpened = true;
    }
    else if(sma12 < sma21 && isOpened === true)
    {
        console.log("vender");
        isOpened = false;
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
        isOpened = true;
    }
    else if(price >= valorVenda && isOpened === true)
    {
        console.log("vender");
        isOpened = false;
    }
    else {
        console.log("aguardar");
    }
}

setInterval(start, 3000);

console.clear();
start();