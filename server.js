const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

// --- LISTA MASSIVA RESTAURADA ---
const LISTA_ATIVOS = [
    { id: "NONE", nome: "❌ DESATIVAR SLOT" },
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
    { id: "frxEURUSD", nome: "💱 EUR/USD" },
    { id: "frxGBPUSD", nome: "💱 GBP/USD" },
    { id: "frxUSDJPY", nome: "💱 USD/JPY" },
    { id: "frxAUDUSD", nome: "💱 AUD/USD" },
    { id: "frxUSDCAD", nome: "💱 USD/CAD" },
    { id: "frxUSDCHF", nome: "💱 USD/CHF" },
    { id: "frxEURGBP", nome: "💱 EUR/GBP" },
    { id: "frxXAUUSD", nome: "🪙 OURO (XAU/USD)" },
    { id: "cryBTCUSD", nome: "₿ BITCOIN (BTC)" },
    { id: "cryETHUSD", nome: "♢ ETHEREUM (ETH)" },
    { id: "cryLTCUSD", nome: "Ł LITECOIN (LTC)" },
    { id: "cryXRPUSD", nome: "✕ RIPPLE (XRP)" }
];

// Estatísticas Diárias e Semanais
let statsDia = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
let statsSemana = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };

let motores = {};
let wsDeriv;
let slots = ["1HZ100V", "R_100", "frxEURUSD", "NONE"];

function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { 
                nome: info ? info.nome : id, wins: 0, loss: 0, aberturaVela: 0, fechamentoAnterior: 0,
                forca: 50, buscandoTaxa: false, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0, sinalPendente: null, precoAtual: 0 
            };
        }
    });
}

function conectarDeriv() {
    wsDeriv = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    wsDeriv.on('open', () => { slots.forEach(id => { if(id !== "NONE") wsDeriv.send(JSON.stringify({ ticks: id })); }); });
    wsDeriv.on('message', (data) => {
        const res = JSON.parse(data);
        if (res.tick) processarTick(res.tick.symbol, res.tick.quote);
    });
    wsDeriv.on('close', () => setTimeout(conectarDeriv, 5000));
}

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA NA DERIV", url: LINK_CORRETORA }]] };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

// --- RELATÓRIOS E RESETS ---

// Checagem de Reset (Diário e Semanal)
setInterval(() => {
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0: Dom, 1: Seg...
    const horas = agora.getHours();
    const minutos = agora.getMinutes();

    if (horas === 0 && minutos === 0) {
        // Reset Diário
        statsDia = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
        Object.keys(motores).forEach(id => { motores[id].wins = 0; motores[id].loss = 0; });

        if (diaSemana === 1) { // Virada de Domingo para Segunda
            statsSemana = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
            enviarTelegram("⭐️ *NOVA SEMANA INICIADA!* ⭐️\nTodos os placares (Diário e Semanal) foram resetados.", false);
        } else {
            enviarTelegram("🕒 *NOVO DIA:* O placar diário foi zerado.", false);
        }
    }
}, 60000);

// Relatório Diário (5 em 5 Minutos)
setInterval(() => {
    if (statsDia.analises === 0) return;
    const dias = ["DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"];
    const hoje = dias[new Date().getDay()];
    const totalW = statsDia.winDireto + statsDia.winGales;
    const assert = ((totalW / statsDia.analises) * 100).toFixed(1);

    enviarTelegram(`📅 *BALANÇO DO DIA: ${hoje}*\n\n` +
                   `✅ Wins Diretos: ${statsDia.winDireto}\n` +
                   `🔄 Wins c/ Gale: ${statsDia.winGales}\n` +
                   `❌ Reds: ${statsDia.loss}\n\n` +
                   `🎯 Assertividade Hoje: ${assert}%`, false);
}, 300000);

// Relatório Semanal (30 em 30 Minutos)
setInterval(() => {
    if (statsSemana.analises === 0) return;
    const totalW = statsSemana.winDireto + statsSemana.winGales;
    const assert = ((totalW / statsSemana.analises) * 100).toFixed(1);

    enviarTelegram(`🏆 *ACUMULADO DA SEMANA* 🏆\n\n` +
                   `📊 Análises totais: ${statsSemana.analises}\n` +
                   `💰 Wins Diretos: ${statsSemana.winDireto}\n` +
                   `🛡 Wins c/ Gale: ${statsSemana.winGales}\n` +
                   `📉 Total de Reds: ${statsSemana.loss}\n\n` +
                   `🔥 *EFICIÊNCIA SEMANAL: ${assert}%*`, true);
}, 1800000);

// --- PROCESSAMENTO ---

function registrarResultado(win, gale) {
    if (win) {
        if (gale === 0) { statsDia.winDireto++; statsSemana.winDireto++; }
        else { statsDia.winGales++; statsSemana.winGales++; }
    } else {
        statsDia.loss++; statsSemana.loss++;
    }
    statsDia.analises++;
    statsSemana.analises++;
}

function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    m.precoAtual = preco;
    const segs = new Date().getSeconds();

    if (m.aberturaVela > 0) {
        m.forca = 50 + ((preco - m.aberturaVela) / (m.aberturaVela * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    if (segs === 0 && m.aberturaVela !== preco) {
        m.fechamentoAnterior = m.aberturaVela; m.aberturaVela = preco;
        let sinal = m.forca >= 70 ? "CALL" : m.forca <= 30 ? "PUT" : null;
        if (sinal && !m.operacaoAtiva) {
            m.operacaoAtiva = sinal; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *SINAL CONFIRMADO*\n👉CLIQUE AGORA👈\n💎 *Ativo:* ${m.nome}\n🎯 *Sinal:* ${sinal === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}`);
        }
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                registrarResultado(true, m.galeAtual);
                m.wins++;
                enviarTelegram(`✅ *WIN: ${m.nome}*`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*`);
            } else {
                registrarResultado(false, m.galeAtual);
                m.loss++;
                enviarTelegram(`❌ *RED: ${m.nome}*`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            }
        }
    }
}

// --- SERVIDOR ---
app.get('/api/status', (req, res) => res.json({ slots, motores, statsDia, statsSemana }));
app.get('/mudar/:index/:novoId', (req, res) => {
    const { index, novoId } = req.params;
    if (wsDeriv && slots[index] !== "NONE") wsDeriv.send(JSON.stringify({ forget: slots[index] }));
    slots[index] = novoId; inicializarMotores();
    if (wsDeriv && novoId !== "NONE") wsDeriv.send(JSON.stringify({ ticks: novoId }));
    res.redirect('/');
});
app.get('/', (req, res) => {
    let options = LISTA_ATIVOS.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    res.send(`<!DOCTYPE html><html><head><title>KCM V24</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{background:#05070a; color:white; font-family:sans-serif; text-align:center; padding:20px;}</style></head>
    <body><h3>KCM ULTIMATE 24H</h3><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
    ${slots.map((id, i) => `<div style="background:#111418; padding:15px; border-radius:15px; border:1px solid #1e90ff;">
    <div id="n-${i}">Carregando...</div><div id="p-${i}" style="font-size:18px; font-weight:bold; margin:10px 0;">---</div>
    <select onchange="location.href='/mudar/${i}/'+this.value" style="width:100%;"><option value="">Trocar...</option>${options}</select></div>`).join('')}
    </div><div id="placar" style="margin-top:20px; color:#1e90ff;">Placar Semanal: 0W - 0L</div>
    <script>setInterval(async()=>{ const r=await fetch('/api/status'); const d=await r.json(); 
    d.slots.forEach((id,i)=>{ const m=d.motores[id]||{nome:"OFF", precoAtual:0}; 
    document.getElementById('n-'+i).innerText=m.nome; document.getElementById('p-'+i).innerText=id==="NONE"?"---":m.precoAtual.toFixed(4); });
    document.getElementById('placar').innerText="Placar Semanal: "+(d.statsSemana.winDireto+d.statsSemana.winGales)+"W - "+d.statsSemana.loss+"L"; }, 2000);</script></body></html>`);
});

inicializarMotores(); conectarDeriv(); app.listen(process.env.PORT || 3000);
