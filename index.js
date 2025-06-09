require('dotenv').config(); //Carrega as variáveis do .env

const crypto = require("crypto"); //Biblioteca de criptografia nativa do node
const axios = require("axios"); //Biblioteca para conexão via API
const WebSocket = require('ws');

//=========================================================
// === WEBSOCKET SERVER ===
const wss = new WebSocket.Server({ port: 3001 });
let clients = [];

wss.on("connection", (ws) => {
    clients.push(ws);
    ws.send("[INFO] Conectado ao servidor de mensagens.");
    ws.on("close", () => {
        clients = clients.filter(c => c !== ws);
    });
});

function logToClients(message) {
    const msg = typeof message === "string" ? message : JSON.stringify(message, null, 2);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// Intercepta console.log para também enviar ao front
const originalLog = console.log;
console.log = (...args) => {
    const msg = args.join(" ");
    originalLog(msg);
    logToClients(msg);
};
console.warn = console.log;
console.error = (...args) => {
    const msg = args.join(" ");
    originalLog("[ERRO] " + msg);
    logToClients("[ERRO] " + msg);
};

//=========================================================
const API_KEY = process.env.API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

const SYMBOL = "BTCUSDT"; //Par que será negociado
const QUANTITY = "0.0100"; //Quantidade da moeda a ser negociada. Ex: BTC
const SALDO_INICIAL_PRIM = "0.00"; //Saldo Inicial na moeda primaria. Ex: BTC
const SALDO_INICIAL_SEC = "2000"; //Saldo Inicial na moeda secundária. Ex: USDT
var SALDO_ATUAL_PRIM = SALDO_INICIAL_PRIM; //Saldo Atual após cada operação na moeda primária. Ex: BTC
var SALDO_ATUAL_SEC = SALDO_INICIAL_SEC; //Saldo Atual após cada operação na moeda secundária. Ex: USDT

const MARGIN = 0.01; //Margem percentual de lucro para abertura de ordem (Estratégia 4). Ex: 1 = 1%
const STOP_LOSS = 0.1; //Valor percentual para enviar ordem de venda caso o prejuízo fique abaixo ou igual a esse valor
var BUY_PRICE = 208470.00; //Preço de compra
var SELL_PRICE = 105900.00; //Preço de venda
var LAST_ORDER_PRICE = 0; //Preço da última ordem executada


var firsOperation = true;

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
    //console.log("================");
    const qtdVelas = "21";
    const interval = "15m";
    try{
        const {data} = await axios.get(API_URL + "/api/v3/klines?limit="+qtdVelas+"&interval="+interval+"&symbol=" + SYMBOL);
        const candle = data[data.length - 1];
        
        const openVal = candle[1]; //Open
        const highVal = candle[2]; //High
        const lowVal = candle[3]; //Low
        const price = parseFloat(candle[4]); //Close

        //console.log("Preço Atual: " + price);

        //Estratégia 1
        //estrategiaPriceCompare(price);

        //Estratégia 2
        //estrategiaSMA(data);

        //Estratégia 3
        //estrategiaComparePriceSmaMargem(data, price);

        //Estratégia 4
        estrategiaMargemStartPrice(price);
    }
    catch(err){
        console.log("[ERROR] ======ERRO AO EXECUTAR ORDEM======");
    }
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

    console.log("Preço Alvo (" + (isOpened ? "SELL" : "BUY") + "): " + (isOpened ? SELL_PRICE : BUY_PRICE));

    if(price <= BUY_PRICE && isOpened === false)
    {
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(price >= SELL_PRICE && isOpened === true)
    {
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else {
        console.log("[WARN] Aguardar");
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
   
    console.log("Preço Alvo (" + (isOpened ? "SELL" : "BUY") + "): " + (isOpened ? SELL_PRICE : BUY_PRICE));

    const sma21 = calcSMA(data);
    const sma12 = calcSMA(data.slice(9));
    console.log("SMA (12): "+sma12);
    console.log("SMA (21): "+sma21);

    if(sma12 > sma21 && isOpened === false)
    {
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(sma12 < sma21 && isOpened === true)
    {
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else {
        console.log("[WARN] Aguardar");
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
    
    console.log(
        "Preço Alvo ("
        + (isOpened ? "SELL" : "BUY") + "): "
        + (isOpened ? parseFloat(valorVenda).toFixed(2) : parseFloat(valorCompra).toFixed(2))
    );

    if(price <= valorCompra && isOpened === false)
    {
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(price >= valorVenda && isOpened === true)
    {
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else {
        console.log("Aguardar");
    }
}

function estrategiaMargemStartPrice(price)
{
    //Estratégia 4: Compara com o preço da última ordem e define uma margem para nova operação
    var buyPriceWithMargin = 0;
    var sellPriceWithMargin = 0;
    var stopLossPrice = 0;

    if(firsOperation){
        buyPriceWithMargin = parseFloat(BUY_PRICE);
        sellPriceWithMargin = parseFloat(SELL_PRICE) + parseFloat(SELL_PRICE * MARGIN / 100);
    }
    else{
        buyPriceWithMargin = parseFloat(LAST_ORDER_PRICE) - parseFloat(LAST_ORDER_PRICE * MARGIN / 100);
        sellPriceWithMargin = parseFloat(LAST_ORDER_PRICE) + parseFloat(LAST_ORDER_PRICE * MARGIN / 100);
    }
    
    stopLossPrice = parseFloat(buyPriceWithMargin) - parseFloat(buyPriceWithMargin * STOP_LOSS / 100);

    if(price <= buyPriceWithMargin && !isOpened)
    {
        console.log("[BUY] " + parseFloat(price).toFixed(2));
        LAST_ORDER_PRICE = price;
        newOrder(SYMBOL, QUANTITY, "buy");
    }
    else if(price >= sellPriceWithMargin && isOpened)
    {
        console.log("[SELL] " + parseFloat(price).toFixed(2));
        console.log("[SELL] Lucro: " + parseFloat(price - LAST_ORDER_PRICE).toFixed(2));
        LAST_ORDER_PRICE = price;
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else if(price <= stopLossPrice && isOpened)
    {
        console.log("[STOP] " + parseFloat(price).toFixed(2));
        console.log("[STOP] Prejuízo: " + parseFloat(price - LAST_ORDER_PRICE).toFixed(2));
        LAST_ORDER_PRICE = price;
        newOrder(SYMBOL, QUANTITY, "sell");
    }
    else
    {
        console.log(
            "[WARN] Aguardar... "
            + " Preço Atual: " + parseFloat(price).toFixed(2)
            + (isOpened ? "" : (" | Alvo BUY: " + parseFloat(buyPriceWithMargin).toFixed(2)))
            + (isOpened ? (" | Alvo SELL: " + parseFloat(sellPriceWithMargin).toFixed(2)) : "")
            + (isOpened ? (" | STOP LOSS: " + parseFloat(stopLossPrice).toFixed(2)) : "")
        );
    }
}

async function newOrder(symbol, quantity, side){
    if(SALDO_ATUAL_SEC <= 0)
    {
        console.log("[INFO] Saldo baixo. Impossível realizar operação.");
        return;
    }
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
        );

        isOpened = (side === "buy" ? true : false);
        firsOperation = false;

        const price = parseFloat(data.fills?.[0]?.price || LAST_ORDER_PRICE);
        const qty = parseFloat(data.executedQty);

        if (side === "buy") {
            // Compra: gasta USDT e recebe BTC
            const totalCost = price * qty;
            SALDO_ATUAL_SEC = (parseFloat(SALDO_ATUAL_SEC) - totalCost).toFixed(8);
            SALDO_ATUAL_PRIM = (parseFloat(SALDO_ATUAL_PRIM) + qty).toFixed(8);
        } else {
            // Venda: gasta BTC e recebe USDT
            const totalGain = price * qty;
            SALDO_ATUAL_PRIM = (parseFloat(SALDO_ATUAL_PRIM) - qty).toFixed(8);
            SALDO_ATUAL_SEC = (parseFloat(SALDO_ATUAL_SEC) + totalGain).toFixed(8);
        }
        
        console.log(side === "buy" ? "[BUY] Comprado" : (side === "stop" ? "[STOP] Vendido" : "[SELL] Vendido"));


        logToClients(`[SALDO] ${SALDO_INICIAL_PRIM},${SALDO_INICIAL_SEC},${SALDO_ATUAL_PRIM},${SALDO_ATUAL_SEC}`);
    }
    catch(err){
        console.log("[ERROR] ======ERRO AO EXECUTAR ORDEM======");
        //console.log(err.response?.data || err.message);
        isOpened = false;
    }
}



console.clear();
start();
setInterval(start, 3000);