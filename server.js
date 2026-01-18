const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

// CONFIGURAÇÃO DA ESTRATÉGIA PAINEL ON
const FORCA_MINIMA = 70; 
const PCT_RECUO_TAXA = 30; 

// --- LISTA DE ATIVOS COMPLETA ---
// --- LISTA DE ATIVOS COMPLETA E ATUALIZADA (SINTÉTICOS, FOREX, METAIS E CRIPTO) ---
const LISTA_ATIVOS = [
    { id: "NONE", nome: "❌ DESATIVAR SLOT" },
    
    // --- ÍNDICES SINTÉTICOS (24/7 - OS MELHORES PARA O ROBÔ) ---
    { id: "1HZ10V", nome: "📈 Volatility 10 (1s)" },
    { id: "1HZ25V", nome: "📈 Volatility 25 (1s)" },
    { id: "1HZ50V", nome: "📈 Volatility 50 (1s)" },
    { id: "1HZ75V", nome: "📈 Volatility 75 (1s)" },
    { id: "1HZ100V", nome: "📈 Volatility 100 (1s)" },
    { id: "R_10", nome: "📊 Volatility 10" },
    { id: "R_25", nome: "📊 Volatility 25" },
    { id: "R_50", nome: "📊 Volatility 50" },
    { id: "R_75", nome: "📊 Volatility 75" },
    { id: "R_100", nome: "📊 Volatility 100" },
    { id: "JD10", nome: "🚀 Jump 10" },
    { id: "JD25", nome: "🚀 Jump 25" },
    { id: "JD50", nome: "🚀 Jump 50" },
    { id: "JD75", nome: "🚀 Jump 75" },
    { id: "JD100", nome: "🚀 Jump 100" },
    { id: "BOOM300", nome: "💥 Boom 300" },
    { id: "BOOM500", nome: "💥 Boom 500" },
    { id: "BOOM1000", nome: "💥 Boom 1000" },
    { id: "CRASH300", nome: "📉 Crash 300" },
    { id: "CRASH500", nome: "📉 Crash 500" },
    { id: "CRASH1000", nome: "📉 Crash 1000" },
    { id: "ST50", nome: "🎢 Step Index" },

    // --- FOREX (PARES MAIORES - SEGUNDA A SEXTA) ---
    { id: "frxEURUSD", nome: "💱 EUR/USD (Euro/Dólar)" },
    { id: "frxGBPUSD", nome: "💱 GBP/USD (Libra/Dólar)" },
    { id: "frxUSDJPY", nome: "💱 USD/JPY (Dólar/Iene)" },
    { id: "frxAUDUSD", nome: "💱 AUD/USD (Dólar Aus./Dólar)" },
    { id: "frxUSDCAD", nome: "💱 USD/CAD (Dólar/Dólar Can.)" },
    { id: "frxUSDCHF", nome: "💱 USD/CHF (Dólar/Franco Suíço)" },
    { id: "frxEURGBP", nome: "💱 EUR/GBP (Euro/Libra)" },
    { id: "frxEURJPY", nome: "💱 EUR/JPY (Euro/Iene)" },
    { id: "frxGBPJPY", nome: "💱 GBP/JPY (Libra/Iene)" },

    // --- METAIS E ENERGIA (COMMODITIES) ---
    { id: "frxXAUUSD", nome: "🪙 OURO (XAU/USD)" },
    { id: "frxXAGUSD", nome: "🥈 PRATA (XAG/USD)" },
    { id: "frxXPDUSD", nome: "🧪 PALÁDIO (XPD/USD)" },
    { id: "frxXPTUSD", nome: "⚪ PLATINA (XPT/USD)" },

    // --- CRIPTOMOEDAS (24/7) ---
    { id: "cryBTCUSD", nome: "₿ BITCOIN (BTC/USD)" },
    { id: "cryETHUSD", nome: "♢ ETHEREUM (ETH/USD)" },
    { id: "cryLTCUSD", nome: "Ł LITECOIN (LTC/USD)" },
    { id: "cryXRPUSD", nome: "✕ RIPPLE (XRP/USD)" },
    { id: "cryBCHUSD", nome: "₿ BITCOIN CASH (BCH/USD)" },
    { id: "cryEOSUSD", nome: "🌐 EOS (EOS/USD)" },
    { id: "cryDSHUSD", nome: "💨 DASH (DASH/USD)" }
];


// --- BANCO DE DADOS EM MEMÓRIA ---
let statsDiario = { analises: 0, winDireto: 0, lossDireto: 0, winGale: 0, lossGale: 0, ativos: {} };
let statsSemanal = {
    segunda: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    terca: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    quarta: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    quinta: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    sexta: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    sabado: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    domingo: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" }
};

let motores = {};
let slots = ["1HZ100V", "R_100", "frxEURUSD", "NONE"];

function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { 
                nome: info ? info.nome : id, wins: 0, loss: 0, 
                aberturaVelaAtual: 0, corpoVelaAnterior: 0, fechamentoVelaAnterior: 0,
                forca: 50, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0,
                buscandoTaxa: false, sinalPendente: null, analiseEnviada: false
            };
        }
    });
}

// --- FUNÇÕES DE TEMPO E MENSAGEM ---
function getHoraBR(offsetSegundos = 0) {
    const data = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    if (offsetSegundos) data.setSeconds(data.getSeconds() + offsetSegundos);
    return data.getHours().toString().padStart(2, '0') + ":" + data.getMinutes().toString().padStart(2, '0') + ":" + data.getSeconds().toString().padStart(2, '0');
}

async function enviarTelegram(msg) {
    const payload = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "📲 DERIV.COM", url: LINK_CORRETORA }]] }
    };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function registrarResultado(ativoNome, resultado, foiGale) {
    const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const diaHoje = dias[agora.getDay()];

    if (!statsDiario.ativos[ativoNome]) statsDiario.ativos[ativoNome] = { w: 0, l: 0 };
    if (resultado === "WIN") {
        if (foiGale) { statsDiario.winGale++; statsSemanal[diaHoje].winGale++; }
        else { statsDiario.winDireto++; statsSemanal[diaHoje].wins++; }
        statsDiario.ativos[ativoNome].w++;
    } else {
        if (foiGale) { statsDiario.lossGale++; statsSemanal[diaHoje].lossGale++; }
        else { statsDiario.lossDireto++; statsSemanal[diaHoje].loss++; }
        statsDiario.ativos[ativoNome].l++;
    }
    statsDiario.analises++;
    statsSemanal[diaHoje].analises++;
    
    let ranking = Object.entries(statsDiario.ativos).sort((a, b) => (b[1].w - b[1].l) - (a[1].w - a[1].l));
    statsSemanal[diaHoje].melhor = ranking[0][0];
    statsSemanal[diaHoje].pior = ranking[ranking.length - 1][0];
}

// --- PROCESSAMENTO DE TICKS ---
function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    const agoraBR = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const segs = agoraBR.getSeconds();

    if (m.aberturaVelaAtual > 0) {
        m.forca = 50 + ((preco - m.aberturaVelaAtual) / (m.aberturaVelaAtual * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    if (segs >= 5 && segs < 10 && !m.analiseEnviada && !m.operacaoAtiva) {
        enviarTelegram(`🔍 *ANALISANDO ENTRADA*\n💎 Ativo: ${m.nome}\n⏰ Entrada: *${getHoraBR(60-segs).slice(0,5)}:00*\n⏳ _Aguardando confirmação..._`);
        m.analiseEnviada = true;
    }

    if (segs === 0 && m.aberturaVelaAtual !== preco) {
        m.sinalPendente = m.forca >= FORCA_MINIMA ? "CALL" : m.forca <= (100 - FORCA_MINIMA) ? "PUT" : null;
        if (m.sinalPendente && !m.operacaoAtiva) {
            m.buscandoTaxa = true;
            enviarTelegram(`⏳ *BUSCANDO TAXA...*\n💎 Ativo: ${m.nome}\n🎯 Direção: ${m.sinalPendente === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}`);
        }
        m.corpoVelaAnterior = Math.abs(preco - m.aberturaVelaAtual);
        m.fechamentoVelaAnterior = preco; m.aberturaVelaAtual = preco;
    }

    if (m.buscandoTaxa && segs < 30) {
        const dist = m.corpoVelaAnterior * (PCT_RECUO_TAXA / 100);
        let bateu = (m.sinalPendente === "CALL" && preco <= (m.fechamentoVelaAnterior - dist)) || 
                    (m.sinalPendente === "PUT" && preco >= (m.fechamentoVelaAnterior + dist));
        if (bateu) {
            m.buscandoTaxa = false; m.operacaoAtiva = m.sinalPendente; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 *CLIQUE AGORA*\n💎 Ativo: ${m.nome}\n🎯 Sinal: ${m.operacaoAtiva === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Início: ${getHoraBR()}\n🏁 Fim: ${getHoraBR(60)}`);
        }
    }

    if (segs >= 30 && m.buscandoTaxa) {
        enviarTelegram(`⚠️ *OPERAÇÃO ABORTADA: ${m.nome}*\nPreço não atingiu a taxa ideal.`);
        m.buscandoTaxa = false; m.sinalPendente = null; m.analiseEnviada = false;
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                registrarResultado(m.nome, "WIN", m.galeAtual > 0);
                enviarTelegram(`✅ *GREEN: ${m.nome}*\n🏆 Resultado: DIRETO\n🔥 Eficiência: ${(( (statsDiario.winDireto + statsDiario.winGale) / statsDiario.analises) * 100).toFixed(1)}%`);
                m.operacaoAtiva = null; m.galeAtual = 0; m.analiseEnviada = false;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*\n🎯 Direção: ${m.operacaoAtiva === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Início: ${getHoraBR()}\n🏁 Fim: ${getHoraBR(60)}`);
            } else {
                registrarResultado(m.nome, "LOSS", true);
                enviarTelegram(`❌ *LOSS: ${m.nome}*\nEstude o gráfico e retorne com calma.`);
                m.operacaoAtiva = null; m.galeAtual = 0; m.analiseEnviada = false;
            }
        }
    }
}

// --- RELATÓRIOS ---
setInterval(() => { // Diário 5 em 5 min
    if (statsDiario.analises === 0) return;
    let ranking = Object.entries(statsDiario.ativos).sort((a,b) => (b[1].w - b[1].l) - (a[1].w - a[1].l)).slice(0,3);
    let rankingTxt = ranking.map((a,i) => `${i+1}º ${a[0]}`).join('\n');
    let msg = `📊 *RELATÓRIO DIÁRIO*\n\n📈 Análises: ${statsDiario.analises}\n✅ Win Direto: ${statsDiario.winDireto}\n🔄 Win Gale: ${statsDiario.winGale}\n❌ Loss: ${statsDiario.lossDireto + statsDiario.lossGale}\n\n🏆 *TOP ATIVOS:*\n${rankingTxt}\n\n🔥 *EFICIÊNCIA: ${(((statsDiario.winDireto + statsDiario.winGale) / statsDiario.analises) * 100).toFixed(1)}%*`;
    enviarTelegram(msg);
}, 300000);

setInterval(() => { // Semanal 20 em 20 min
    const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const diaHoje = dias[new Date().getDay()];
    const s = statsSemanal[diaHoje];
    if (s.analises === 0) return;
    let msg = `📅 *RELATÓRIO SEMANAL (${diaHoje.toUpperCase()})*\n\n📋 Análises: ${s.analises}\n✅ Total Win: ${s.wins + s.winGale}\n❌ Total Loss: ${s.loss + s.lossGale}\n🔝 Melhor: ${s.melhor}\n🔄 Wins c/ Gale: ${s.winGale}\n\n🔥 *ASSERTIVIDADE: ${(((s.wins + s.winGale) / s.analises) * 100).toFixed(1)}%*`;
    enviarTelegram(msg);
}, 1200000);

// --- CONEXÃO ---
let ws;
function conectar(){
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    ws.on('open', () => slots.forEach(id => id!=="NONE" && ws.send(JSON.stringify({ticks:id}))));
    ws.on('message', data => { const r=JSON.parse(data); if(r.tick) processarTick(r.tick.symbol, r.tick.quote); });
    ws.on('close', () => setTimeout(conectar, 5000));
}

inicializarMotores(); conectar(); app.listen(process.env.PORT || 3000);
