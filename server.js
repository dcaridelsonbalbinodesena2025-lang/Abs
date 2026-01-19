const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

app.use(express.json());

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

// --- ROTAS DO PAINEL ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>K.C.M V19 - CONTROLE MESTRE</title>
        <style>
            :root { --neon-blue: #1e90ff; --neon-green: #00ff88; --neon-red: #ff3355; --bg-dark: #05070a; --royal-blue: #0047AB; }
            body { background: var(--bg-dark); color: white; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 10px; display: flex; flex-direction: column; align-items: center; }
            .logo { font-size: 22px; font-weight: 900; color: #fff; margin: 10px 0; }
            .logo span { color: var(--neon-blue); font-style: italic; }
            .painel-global { background: linear-gradient(180deg, #111418 0%, #05070a 100%); border: 2px solid var(--royal-blue); border-radius: 15px; width: 95%; max-width: 600px; padding: 15px; margin-bottom: 20px; box-shadow: 0 0 20px rgba(0,71,171,0.3); }
            .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }
            .stat-label { font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
            .stat-val { font-size: 18px; font-weight: bold; }
            .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 600px; }
            .card { background: #111418; border-radius: 20px; padding: 12px; border: 1px solid #1e2228; position: relative; }
            .thermometer-wrap { width: 100%; height: 8px; background: #222; border-radius: 4px; margin: 8px 0; overflow: hidden; border: 1px solid #333; }
            .thermometer-fill { height: 100%; width: 50%; transition: 0.4s; background: linear-gradient(90deg, #ff3355, #f0b90b, #00ff88); }
            .status-box { width: 100%; height: 40px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #333; text-align: center; }
            .timer-large { font-size: 38px; font-weight: bold; text-align: center; color: #fff; margin: 5px 0; }
            .select-ativo { background: #0d0f12; color: #fff; border: 1px solid var(--royal-blue); font-size: 12px; width: 100%; padding: 8px; margin-top: 10px; border-radius: 5px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="logo">K.C<span>📈</span>M IQ OPTION V19</div>
        <div class="painel-global">
            <div class="stats-row">
                <div><span class="stat-label">Análises</span><span class="stat-val" id="g-analises">0</span></div>
                <div><span class="stat-label">Wins</span><span class="stat-val" style="color:var(--neon-green)" id="g-wins">0</span></div>
                <div><span class="stat-label">Loss</span><span class="stat-val" style="color:var(--neon-red)" id="g-loss">0</span></div>
                <div><span class="stat-label">Eficiência</span><span class="stat-val" id="g-perc">0%</span></div>
            </div>
        </div>
        <div class="grid-container" id="grid">
            ${[0,1,2,3].map(i => `
                <div class="card">
                    <div class="stat-label">FORÇA DO MERCADO</div>
                    <div class="thermometer-wrap"><div class="thermometer-fill" id="therm-${i}"></div></div>
                    <div class="status-box"><div id="status-${i}" style="font-size:9px; font-weight:bold; color:#00ff88;">ANALISANDO...</div></div>
                    <div class="timer-large" id="timer-${i}">00</div>
                    <select class="select-ativo" onchange="mudarAtivo(${i}, this.value)">
                        ${LISTA_ATIVOS.map(a => `<option value="${a.id}" ${slots[i] === a.id ? 'selected' : ''}>${a.nome}</option>`).join('')}
                    </select>
                </div>
            `).join('')}
        </div>
        <script>
            async function mudarAtivo(index, ativo) {
                await fetch('/selecionar-ativo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ index, ativo })
                });
            }
            setInterval(async () => {
                const res = await fetch('/api-dados');
                const data = await res.json();
                document.getElementById('g-analises').innerText = data.global.analises;
                document.getElementById('g-wins').innerText = data.global.wins;
                document.getElementById('g-loss').innerText = data.global.loss;
                document.getElementById('g-perc').innerText = data.global.eficiencia + "%";
                data.slots.forEach((s, i) => {
                    document.getElementById('therm-'+i).style.width = s.forca + "%";
                    document.getElementById('timer-'+i).innerText = s.timer;
                    document.getElementById('status-'+i).innerText = s.status;
                });
            }, 1000);
        </script>
    </body></html>`);
});

app.get('/api-dados', (req, res) => {
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();
    const dadosSlots = slots.map(id => {
        const m = motores[id] || { forca: 50 };
        return {
            forca: m.forca || 50,
            timer: (60 - segs).toString().padStart(2, '0'),
            status: m.operacaoAtiva ? "🔥 OPERANDO" : (m.buscandoTaxa ? "⏳ AGUARDANDO TAXA" : "🔍 ANALISANDO...")
        };
    });
    let winsTotal = statsDiario.winDireto + statsDiario.winGale;
    let lossTotal = statsDiario.lossDireto + statsDiario.lossGale;
    res.json({
        global: {
            analises: statsDiario.analises,
            wins: winsTotal,
            loss: lossTotal,
            eficiencia: statsDiario.analises > 0 ? ((winsTotal / statsDiario.analises) * 100).toFixed(1) : 0
        },
        slots: dadosSlots
    });
});

app.post('/selecionar-ativo', (req, res) => {
    const { index, ativo } = req.body;
    slots[index] = ativo;
    inicializarMotores();
    if(ws) ws.close(); 
    res.json({ success: true });
});

// --- SUA LÓGICA ORIGINAL DE PROCESSAMENTO ---
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

async function enviarTelegram(msg) {
    const payload = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "📲 DERIV.COM", url: LINK_CORRETORA }]] }
    };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();

    if (m.aberturaVelaAtual > 0) {
        m.forca = 50 + ((preco - m.aberturaVelaAtual) / (m.aberturaVelaAtual * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    if (!m.operacaoAtiva && !m.buscandoTaxa) {
        if (segs === 0 && m.aberturaVelaAtual !== preco) {
            let dirPrevista = m.forca >= 50 ? "🟢 COMPRA" : "🔴 VENDA";
            enviarTelegram(`🔍 *BUSCANDO POSSÍVEL ENTRADA*\n💎 Ativo: ${m.nome}\n🎯 Direção: ${dirPrevista}`);
            setTimeout(() => {
                if (m.forca >= FORCA_MINIMA || m.forca <= (100 - FORCA_MINIMA)) {
                    m.sinalPendente = m.forca >= FORCA_MINIMA ? "CALL" : "PUT";
                    m.buscandoTaxa = true;
                    enviarTelegram(`⏳ *AGUARDANDO CONFIRMAÇÃO*\n💎 Ativo: ${m.nome}`);
                }
            }, 1200);
            m.corpoVelaAnterior = Math.abs(preco - m.aberturaVelaAtual);
            m.fechamentoVelaAnterior = preco; m.aberturaVelaAtual = preco;
        }
    }

    if (m.buscandoTaxa && segs < 30) {
        const dist = m.corpoVelaAnterior * (PCT_RECUO_TAXA / 100);
        if ((m.sinalPendente === "CALL" && preco <= (m.fechamentoVelaAnterior - dist)) || 
            (m.sinalPendente === "PUT" && preco >= (m.fechamentoVelaAnterior + dist))) {
            m.buscandoTaxa = false; m.operacaoAtiva = m.sinalPendente; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n💎 Ativo: ${m.nome}`);
        }
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                statsDiario.analises++; statsDiario.winDireto++;
                enviarTelegram(`✅ *GREEN: ${m.nome}*`);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*`);
            } else {
                statsDiario.analises++; statsDiario.lossGale++;
                enviarTelegram(`❌ *LOSS FINAL: ${m.nome}*`);
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

inicializarMotores(); conectar(); app.listen(process.env.PORT || 3000);
