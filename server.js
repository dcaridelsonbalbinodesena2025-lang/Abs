const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors'); // <--- A CHAVE PARA CONECTAR AO GITHUB
const app = express();

app.use(express.json());
app.use(cors()); // <--- LIBERA O ACESSO DO PAINEL

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

const FORCA_MINIMA = 70; 
const PCT_RECUO_TAXA = 30; 

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


let statsDiario = { analises: 0, winDireto: 0, lossDireto: 0, winGale: 0, lossGale: 0, ativos: {} };
let motores = {};
let slots = ["1HZ100V", "R_100", "frxEURUSD", "1HZ10V"];

// --- FUNÇÕES AUXILIARES ---
function getHoraBR(offsetSegundos = 0) {
    const data = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    if (offsetSegundos) data.setSeconds(data.getSeconds() + offsetSegundos);
    return data.getHours().toString().padStart(2, '0') + ":" + 
           data.getMinutes().toString().padStart(2, '0') + ":" + 
           data.getSeconds().toString().padStart(2, '0');
}

async function enviarTelegram(msg) {
    const payload = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "📲 ACESSAR DERIV", url: LINK_CORRETORA }]] }
    };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

// --- ROTAS DO PAINEL (COORDENADAS) ---
app.get('/api-dados', (req, res) => {
    const winsTotal = statsDiario.winDireto + statsDiario.winGale;
    const lossTotal = statsDiario.lossDireto + statsDiario.lossGale;
    res.json({
        global: {
            analises: statsDiario.analises,
            wins: winsTotal,
            loss: lossTotal,
            eficiencia: statsDiario.analises > 0 ? ((winsTotal / statsDiario.analises) * 100).toFixed(1) : 0
        },
        slots: slots.map(id => {
            const m = motores[id] || { forca: 50 };
            return {
                forca: m.forca || 50,
                status: m.operacaoAtiva ? "🔥 OPERANDO" : (m.buscandoTaxa ? "⏳ TAXA" : "🔍 ANALISANDO")
            };
        })
    });
});

app.post('/selecionar-ativo', (req, res) => {
    const { index, ativo } = req.body;
    slots[index] = ativo;
    inicializarMotores();
    if(ws) { ws.close(); } // Reinicia para atualizar o par
    res.json({ success: true });
});

// --- LÓGICA PRINCIPAL ---
function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { 
                nome: info ? info.nome : id, wins: 0, loss: 0, 
                aberturaVelaAtual: 0, corpoVelaAnterior: 0, fechamentoVelaAnterior: 0,
                forca: 50, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0,
                buscandoTaxa: false, sinalPendente: null
            };
        }
    });
}

function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();

    if (m.aberturaVelaAtual > 0) {
        m.forca = 50 + ((preco - m.aberturaVelaAtual) / (m.aberturaVelaAtual * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    if (!m.operacaoAtiva && !m.buscandoTaxa && segs === 0 && m.aberturaVelaAtual !== preco) {
        let dirPrevista = m.forca >= 50 ? "🟢 COMPRA" : "🔴 VENDA";
        enviarTelegram(`🔍 *ANALISANDO:* ${m.nome}\n🎯 Tendência: ${dirPrevista}\n⏰ Checagem em 1s...`);
        
        setTimeout(() => {
            if (m.forca >= FORCA_MINIMA || m.forca <= (100 - FORCA_MINIMA)) {
                m.sinalPendente = m.forca >= FORCA_MINIMA ? "CALL" : "PUT";
                m.buscandoTaxa = true;
                enviarTelegram(`⏳ *AGUARDANDO TAXA:* ${m.nome}\n🎯 Direção: ${m.sinalPendente === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Expiração: 1 Minuto`);
            }
        }, 1200);
        m.corpoVelaAnterior = Math.abs(preco - m.aberturaVelaAtual);
        m.fechamentoVelaAnterior = preco; m.aberturaVelaAtual = preco;
    }

    if (m.buscandoTaxa && segs < 30) {
        const dist = m.corpoVelaAnterior * (PCT_RECUO_TAXA / 100);
        let bateuTaxa = (m.sinalPendente === "CALL" && preco <= (m.fechamentoVelaAnterior - dist)) || 
                        (m.sinalPendente === "PUT" && preco >= (m.fechamentoVelaAnterior + dist));
        if (bateuTaxa) {
            m.buscandoTaxa = false; m.operacaoAtiva = m.sinalPendente; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *ENTRADA REALIZADA*\n💎 Ativo: ${m.nome}\n🎯 Direção: ${m.operacaoAtiva === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n🏁 Fim: ${getHoraBR(60)}`);
        }
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                statsDiario.analises++;
                if(m.galeAtual > 0) statsDiario.winGale++; else statsDiario.winDireto++;
                enviarTelegram(`✅ *GREEN NO ${m.nome}*\n🏆 Resultado: ${m.galeAtual > 0 ? 'GALE '+m.galeAtual : 'DIRETO'}`);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *ENTRANDO NO GALE ${m.galeAtual}* - ${m.nome}`);
            } else {
                statsDiario.analises++; statsDiario.lossGale++;
                enviarTelegram(`❌ *LOSS FINAL:* ${m.nome}`);
                m.operacaoAtiva = null; m.galeAtual = 0;
            }
        }
    }
}

let ws;
function conectar(){
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    ws.on('open', () => slots.forEach(id => id!=="NONE" && ws.send(JSON.stringify({ticks:id}))));
    ws.on('message', data => { const r=JSON.parse(data); if(r.tick) processarTick(r.tick.symbol, r.tick.quote); });
    ws.on('close', () => setTimeout(conectar, 5000));
}

inicializarMotores(); conectar(); 
app.listen(process.env.PORT || 3000, () => console.log("Robô Ativo na Render!"));
